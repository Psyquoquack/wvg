let psshs=chrome.extension.getBackgroundPage().psshs;
let requests=chrome.extension.getBackgroundPage().requests;
let pageURL=chrome.extension.getBackgroundPage().pageURL;
let targetIds=chrome.extension.getBackgroundPage().targetIds;
let clearkey=chrome.extension.getBackgroundPage().clearkey;
let mpdFiles=chrome.extension.getBackgroundPage().mpdFiles;
let BaseUrlVid=chrome.extension.getBackgroundPage().BaseUrl;

async function checkStringInMpd(url, searchString) {
    try {
        // Fetch the .mpd file
        const response = await fetch(url);

        // Check if the response is OK (status code 200-299)
        if (!response.ok) {
            throw new Error(`Failed to fetch the .mpd file: ${response.statusText}`);
        }

        // Convert the response to text
        const mpdText = await response.text();
        // Check if the searchString is in the .mpd file
        const stringExists = mpdText.includes(searchString);
        return stringExists;
    } catch (error) {
        return false;
    }
}
async function guess(){
    //Be patient!
    document.body.style.cursor = "wait";
    document.getElementById("guess").disabled=true

    const BaseURlCheckHTTP = await checkStringInMpd(mpdFiles, "<BaseURL>http");
    const BaseURlCheck = await checkStringInMpd(mpdFiles, "<BaseURL>");

    //Init Pyodide
    let pyodide = await loadPyodide();
    await pyodide.loadPackage(["certifi-2024.2.2-py3-none-any.whl","charset_normalizer-3.3.2-py3-none-any.whl","construct-2.8.8-py2.py3-none-any.whl","idna-3.6-py3-none-any.whl","packaging-23.2-py3-none-any.whl","protobuf-4.24.4-cp312-cp312-emscripten_3_1_52_wasm32.whl","pycryptodome-3.20.0-cp35-abi3-emscripten_3_1_52_wasm32.whl","pymp4-1.4.0-py3-none-any.whl","pyodide_http-0.2.1-py3-none-any.whl","pywidevine-1.8.0-py3-none-any.whl","requests-2.31.0-py3-none-any.whl","urllib3-2.2.1-py3-none-any.whl"].map(e=>"wheels/"+e))

    //Configure Guesser
    pyodide.globals.set("pssh", document.getElementById('pssh').value);
    pyodide.globals.set("licUrl", requests[userInputs['license']]['url']);
    pyodide.globals.set("licHeaders", requests[userInputs['license']]['headers']);
    pyodide.globals.set("licBody", requests[userInputs['license']]['body']);
    let pre=await fetch('python/pre.py').then(res=>res.text())
    let after=await fetch('python/after.py').then(res=>res.text())
    let scheme=await fetch(`python/schemes/${document.getElementById("scheme").value}.py`).then(res=>res.text())

    //Get result
    let result = await pyodide.runPythonAsync([pre, scheme, after].join("\n"));
    try {
        let BaseUrl = BaseUrlVid.substring(0, mpdFiles.lastIndexOf('/') + 1);
        const lines = result.split('\n');
        const keys = [];
    
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() !== "") {
                keys.push("--key " + lines[i].trim());
            }
        }
        let sresult;
        if (BaseURlCheck) {
            if (BaseURlCheckHTTP) {
                document.getElementById('result').value = `N_m3u8DL-RE ${keys.join(" ")} ${mpdFiles} -M mkv`;
            } else {
                document.getElementById('result').value = `N_m3u8DL-RE ${keys.join(" ")} --base-url ${BaseUrl} ${mpdFiles} -M mkv`;
            }
        } else {
            document.getElementById('result').value = `N_m3u8DL-RE ${keys.join(" ")} ${mpdFiles} -M mkv`;
        }
    
    } catch (error) {
        console.log(error);
        document.getElementById('result').value = result;
    }

    //Save history
    let historyData={
        PSSH: document.getElementById('pssh').value,
        KEYS: result.split("\n").slice(0,-1)
    }
    chrome.storage.local.set({[pageURL]: historyData}, null);

    //All Done!
    document.body.style.cursor = "auto";
    document.getElementById("guess").disabled=false
}

function copyResult(){
    this.select();
    navigator.clipboard.writeText(this.value);
}

window.corsFetch = (u, m, h, b) => {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(targetIds[0], {type:"FETCH", u:u, m:m, h:h, b:b}, {frameId:targetIds[1]}, res => {
            resolve(res)
        })
    })
}

async function autoSelect(){
    let selectRules = await fetch("selectRules.conf").then((r)=>r.text());
    //Remove blank lines, comment-outs, and trailing spaces at the end of lines
    selectRules = selectRules.replace(/\n^\s*$|\s*\/\/.*|\s*$/gm, "");
    selectRules = selectRules.split("\n").map(row => row.split("$$"));
    for(var item of selectRules){
        let search = requests.map(r => r['url']).findIndex(e => e.includes(item[0]));
        if(search>=0){
            if(item[1]) document.getElementById("scheme").value = item[1];
            requestList.children[search].click();
            break;
        }
    }
    if(psshs.length==1){
        document.getElementById('pssh').value=psshs[0];
    }
    if(requests.length==1){
        requestList.children[0].click();
    }
}

if (clearkey) {
    document.getElementById('noEME').style.display = 'none';
    document.getElementById('ckHome').style.display = 'grid';
    document.getElementById('ckResult').value = clearkey;
    document.getElementById('ckResult').addEventListener("click", copyResult);
    document.getElementById('toggleHistory').style.display = 'none'
} else if (psshs.length) {
    document.getElementById('noEME').style.display = 'none';
    document.getElementById('home').style.display = 'grid';
    document.getElementById('guess').addEventListener("click", guess);
    document.getElementById('result').addEventListener("click", copyResult);
    drawList(psshs, 'psshSearch', 'psshList', 'pssh');
    drawList(requests.map(r => r['url']), 'requestSearch', 'requestList', 'license');
    autoSelect();
}
