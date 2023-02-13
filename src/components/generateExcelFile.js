import { utils, write } from 'xlsx';

export function generateExcelFile(highlightData) {
    const newData = highlightData.map(data => {
        return {
            "APN": data["apn"],
            "Owner": data["m1_owner"],
            "Care Of": data["m2_careof"],
            "Street Address": data["m3_street"],
            "City/State/Zip": data["m4_city"],
            // Save this for later..."Mailing Labels": data["apn"] + '\n' + data["owner"] + "\n" + data["m_add_1"] + "\n" + data["m_add_2"] + "\n" + data["m_add_3"]
        }
    });

    const ws = utils.json_to_sheet(newData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Parcels");
    const excelBuffer = write(wb, { type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    const url = window.URL.createObjectURL(data);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "Mailing_Labels.xlsx";
    downloadLink.classList.add("download-link");
    // create a button
    const existingDownloadLinks = document.getElementsByClassName("download-link");
    while (existingDownloadLinks.length > 0) {
        existingDownloadLinks[0].remove();
    }
    const downloadButton = document.createElement("a");
    downloadButton.innerHTML = "Download Mailing Labels";

    downloadButton.classList.add("download-link");
    // add an event listener to the button
    downloadButton.addEventListener("click", function () {
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    });
    document.body.appendChild(downloadButton);
}
