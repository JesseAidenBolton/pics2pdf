import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';

// Move an item in an array from one index to another
function moveItem(arr, fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= arr.length) return arr; // out of bounds
    const newArr = [...arr];
    const item = newArr.splice(fromIndex, 1)[0];
    newArr.splice(toIndex, 0, item);
    return newArr;
}

function App() {
    // We store objects with { file, rotation } for each image
    const [images, setImages] = useState([]);

    const cameraRef = useRef(null);
    const galleryRef = useRef(null);

    // Convert File -> { file, rotation: 0 } and append to our list
    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files).map((f) => ({
            file: f,
            rotation: 0,
        }));
        setImages((prev) => [...prev, ...newFiles]);
    };

    // Rotate an image in 90-degree steps
    const rotateImage = (index) => {
        setImages((prev) => {
            const updated = [...prev];
            updated[index].rotation = (updated[index].rotation + 90) % 360;
            return updated;
        });
    };

    // Move Up/Down
    const moveUp = (index) => {
        setImages((prev) => moveItem(prev, index, index - 1));
    };

    const moveDown = (index) => {
        setImages((prev) => moveItem(prev, index, index + 1));
    };

    // Convert File to Base64 Data URL
    const fileToDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    };

    /**
     * Draw the image onto an offscreen canvas with the specified rotation.
     * Also scale to fit "maxWidth" x "maxHeight" without stretching.
     * Returns a dataURL from the canvas to pass to jsPDF.
     */
    const drawRotatedCanvas = async (base64, rotation, maxWidth, maxHeight) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64;
            img.onload = () => {
                // 1) Create an offscreen canvas
                // If rotation = 90 or 270, the canvas base dimension is swapped
                const rotated90or270 = rotation === 90 || rotation === 270;
                const canvasWidth = rotated90or270 ? img.height : img.width;
                const canvasHeight = rotated90or270 ? img.width : img.height;

                // We'll draw at "full size" then scale down in a second step
                const canvas = document.createElement('canvas');
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;

                const ctx = canvas.getContext('2d');

                // 2) Translate & rotate the context
                // Rotate about center
                ctx.translate(canvasWidth / 2, canvasHeight / 2);
                ctx.rotate((rotation * Math.PI) / 180);
                // Then draw image with its center at (0,0)
                // So top-left corner is half width/height negative
                const drawW = rotated90or270 ? img.height : img.width;
                const drawH = rotated90or270 ? img.width : img.height;
                ctx.drawImage(img, -drawW / 2, -drawH / 2);

                // Now we have a "rotated" image on the canvas, but it's still
                // the original full resolution dimension. We want to scale it
                // to fit within maxWidth x maxHeight, preserving aspect ratio.

                // 3) Scale down to fit in the PDF cell
                // We'll create a second, final canvas for the scaled version.
                const finalCanvas = document.createElement('canvas');

                // figure out the aspect ratio for "canvas.width" x "canvas.height" => final bounding box
                const ratio = canvas.width / canvas.height;
                const boxRatio = maxWidth / maxHeight;

                let targetW, targetH;
                if (ratio > boxRatio) {
                    // relatively wider => match width
                    targetW = maxWidth;
                    targetH = maxWidth / ratio;
                } else {
                    // relatively taller => match height
                    targetH = maxHeight;
                    targetW = maxHeight * ratio;
                }

                finalCanvas.width = targetW;
                finalCanvas.height = targetH;
                const finalCtx = finalCanvas.getContext('2d');

                // draw the big rotated canvas onto the smaller final canvas
                finalCtx.drawImage(canvas, 0, 0, targetW, targetH);

                const dataURL = finalCanvas.toDataURL('image/jpeg', 0.9);
                resolve(dataURL);
            };
        });
    };

    // Generate PDF with 2x2 grid per page
    const generatePDF = async () => {
        if (images.length === 0) {
            alert('No images selected!');
            return;
        }

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = 210;
        const pageHeight = 297;

        const cols = 2;
        const rows = 2;
        const imagesPerPage = cols * rows; // 4

        // Each cell's bounding box in mm
        const cellWidth = pageWidth / cols;    // e.g. 105
        const cellHeight = pageHeight / rows;  // e.g. 148.5

        let indexInPage = 0; // track how many images placed on the current page

        for (let i = 0; i < images.length; i++) {
            const { file, rotation } = images[i];
            const base64 = await fileToDataURL(file);

            // We'll produce a final dataURL with the rotation & scaled to fit cell
            const rotatedDataURL = await drawRotatedCanvas(base64, rotation, cellWidth, cellHeight);

            // Figure out row & col for this image
            const row = Math.floor(indexInPage / cols);
            const col = indexInPage % cols;

            const x = col * cellWidth;   // left coordinate
            const y = row * cellHeight;  // top coordinate

            // Add the image to PDF at (x,y), sized to exactly cellWidth/Height
            pdf.addImage(rotatedDataURL, 'JPEG', x, y, cellWidth, cellHeight);

            indexInPage++;

            // If we've filled up the page (4 images), or it's the last image
            // If there's still more images, add a page and reset indexInPage
            if (indexInPage === imagesPerPage && i < images.length - 1) {
                pdf.addPage();
                indexInPage = 0;
            }
        }

        pdf.save('my-photos.pdf');
    };

    // ======= STYLES ======= //
    const containerStyle = {
        fontFamily: 'sans-serif',
        maxWidth: '400px',
        margin: '0 auto',
        padding: '20px',
        textAlign: 'center',
    };

    const buttonRowStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
    };

    const hiddenInputStyle = { display: 'none' };

    const bigButtonStyle = {
        display: 'block',
        width: '100%',
        maxWidth: '300px',
        padding: '12px 24px',
        backgroundColor: '#6200ee',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
    };

    const pdfButtonStyle = {
        ...bigButtonStyle,
        backgroundColor: '#03dac6',
        color: '#000',
        marginTop: '10px',
    };

    // Thumbnails list
    const listStyle = {
        listStyle: 'none',
        padding: 0,
        margin: '20px 0',
    };
    const itemStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
    };
    const leftStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    };
    const thumbStyle = {
        width: '60px',
        height: '60px',
        objectFit: 'cover',
        borderRadius: '4px',
    };
    const smallButtonColumn = {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    };
    const smallButtonStyle = {
        padding: '4px 8px',
        fontSize: '12px',
        cursor: 'pointer',
    };

    return (
        <div style={containerStyle}>
            <h1>Pics2PDF (2x2 Grid)</h1>

            <div style={buttonRowStyle}>
                {/* Camera */}
                <button style={bigButtonStyle} onClick={() => cameraRef.current.click()}>
                    Take Photo(s)
                </button>
                <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    style={hiddenInputStyle}
                    onChange={handleFileChange}
                />

                {/* Gallery */}
                <button style={bigButtonStyle} onClick={() => galleryRef.current.click()}>
                    Select from Gallery
                </button>
                <input
                    ref={galleryRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={hiddenInputStyle}
                    onChange={handleFileChange}
                />
            </div>

            {images.length > 0 && (
                <>
                    <p>{images.length} image(s) selected</p>
                    <ul style={listStyle}>
                        {images.map((imgObj, index) => {
                            const fileURL = URL.createObjectURL(imgObj.file);
                            const cssRotation = `rotate(${imgObj.rotation}deg)`;

                            return (
                                <li key={index} style={itemStyle}>
                                    <div style={leftStyle}>
                                        <img
                                            src={fileURL}
                                            alt="preview"
                                            style={{
                                                ...thumbStyle,
                                                transform: cssRotation,
                                            }}
                                        />
                                    </div>
                                    <div style={smallButtonColumn}>
                                        <button style={smallButtonStyle} onClick={() => rotateImage(index)}>
                                            Rotate
                                        </button>
                                        <button style={smallButtonStyle} onClick={() => moveUp(index)}>
                                            Up
                                        </button>
                                        <button style={smallButtonStyle} onClick={() => moveDown(index)}>
                                            Down
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}

            <button style={pdfButtonStyle} onClick={generatePDF}>
                Generate PDF
            </button>
        </div>
    );
}

export default App;
