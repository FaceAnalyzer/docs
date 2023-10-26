const baseUrl = "http://localhost:5120";


const finishFileId = document.getElementById("fileId");
const finishBtn = document.getElementById("btn-finish");
finishBtn.addEventListener("click", async () => {
    const fileId = finishFileId.value;
    finishUpload(fileId);
});

const fileInput = document.getElementById("file");
const chunkSizeInput = document.getElementById("size");
let file;
fileInput.addEventListener('change', async (e) => {
    console.log(e);
    file = e.target.files[0];
    console.log(file);
});


const btn = document.getElementById("btn")
btn.addEventListener("click", () => upload(file))



/**
 * 
 * @param {File} fileToUpload 
 */
async function upload(fileToUpload) {
    let offset = 0;
    // chunkSize = 5 * 1024 * 1024;// 5MB
    const chunkSize = chunkSizeInput.value * 1024; // scale to KB
    const fileUplaod = await addUpload(fileToUpload);
    const chunks = [];
    let order = 1;
    while (offset < fileToUpload.size) {
        const chunk = fileToUpload.slice(offset, offset + chunkSize);
        chunks.push({
            content: chunk,
            fileId: fileUplaod.id,
            order: order,
        });
        order++;
        offset += chunkSize;
    }

    for (chunk of chunks) {
        await addChunk(chunk);
        updateProgressBar((chunk.order / chunks.length) * 100);
        await sleep(100);
    }
    finishUpload(fileUplaod.id);
}
/**
 * 
 * @param {File} fileToUpload 
 * @returns {Promise<{id: number; name: string;}>}
 */
async function addUpload(fileToUpload) {

    const res = await fetch(`${baseUrl}/FileUploads/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name: fileToUpload.name,
            size: fileToUpload.size,
        }),
    });
    const data = await res.json();
    return data;


}

async function finishUpload(fileUploadId) {
    const res = await fetch(`${baseUrl}/FileUploads/finish/${fileUploadId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
    });
    const data = await res.json();
    return data;
}

function blobToBase64(blob) {
    const reader = new FileReader();
    const promise = new Promise((resolve, reject) => {
        reader.onload = function () {
            const base64String = reader.result.split(',')[1]; // Extract the Base64 part
            resolve(base64String);
        };
    });
    reader.readAsDataURL(blob);

    return promise;
}


/**
 * 
 * @param {{ 
 * order: number;
 * content: Blob;
 * fileId: number;
 *  }} chunk 
 */
async function addChunk(chunk) {
    const content = await blobToBase64(chunk.content);
    const body = {
        Content: content,
        Order: chunk.order,
        FileId: chunk.fileId,
    };
    const res = await fetch(`${baseUrl}/FileUploads/chunks`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    return data.id;
}

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}

class FileUploadScheduler {
    constructor(fileUpload) {
        this.queue = [];
        this.fileUpload = fileUpload;

    }

    addTask(task) {
        this.queue.push(task);
    }

    run() {
        let interval = setInterval(async () => {
            if (this.queue.length === 0) {
                console.log("taks done ... ");
                finishUpload(this.fileUpload.id)
                clearInterval(interval);

                return;
            }
            const task = this.queue.shift();
            await task();
        }, 1000);
    }
}




function updateProgressBar(width) {
    const progressBar = document.getElementById("progress-bar");
    if (width >= 100) {
        progressBar.textContent = "100%";
        progressBar.style.width = 100 + "%";
        progressBar.textContent = 100 + "%";
    } else {
        progressBar.style.width = Math.ceil(width) + "%";
        progressBar.textContent = Math.ceil(width) + "%";
    }
}


