import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';

/** Convert millimeters to pixels at given DPI (default 150 for better clarity). */
function mmToPx(mm, dpi = 150) {
    // 1 inch = 25.4 mm
    // px per inch = dpi
    // so px per mm = dpi / 25.4
    return Math.round(mm * (dpi / 25.4));
}

function moveItem(arr, fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= arr.length) return arr;
    const newArr = [...arr];
    const item = newArr.splice(fromIndex, 1)[0];
    newArr.splice(toIndex, 0, item);
    return newArr;
}

function App() {
    const [images, setImages] = useState([]);
    const cameraRef = useRef(null);
    const galleryRef = useRef(null);

    // Handle file selection
    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files).map((f) => ({
            file: f,
            rotation: 0
        }));
        setImages((prev) => [...prev, ...newFiles]);
    };

    // Rotate image in 90° increments
    const rotateImage = (index) => {
        setImages((prev) => {
            const updated = [...prev];
            updated[index].rotation = (updated[index].rotation + 90) % 360;
            return updated;
        });
    };

    const moveUp = (index) => {
        setImages((prev) => moveItem(prev, index, index - 1));
    };
    const moveDown = (index) => {
        setImages((prev) => moveItem(prev, index, index + 1));
    };

    // Convert File -> base64 data
    const fileToDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    };

    /**
     * Draw rotated/scaled image onto a final canvas of size (targetWidthPx × targetHeightPx).
     * This ensures high pixel density so it won't look blurred in PDF.
     */
    const drawRotatedCanvas = async (base64, rotation, targetWidthPx, targetHeightPx) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64;
            img.onload = () => {
                // First, figure out the size of the intermediate canvas needed
                // based on rotation. If rotation is 90 or 270, width/height swap.
                const rotate90or270 = rotation === 90 || rotation === 270;
                const tmpCanvasWidth = rotate90or270 ? img.height : img.width;
                const tmpCanvasHeight = rotate90or270 ? img.width : img.height;

                // Create the first canvas to rotate the image
                const tmpCanvas = document.createElement('canvas');
                tmpCanvas.width = tmpCanvasWidth;
                tmpCanvas.height = tmpCanvasHeight;
                const tmpCtx = tmpCanvas.getContext('2d');

                // Move origin to center, rotate
                tmpCtx.translate(tmpCanvasWidth / 2, tmpCanvasHeight / 2);
                tmpCtx.rotate((rotation * Math.PI) / 180);
                // Draw image with center alignment
                const drawW = rotate90or270 ? img.height : img.width;
                const drawH = rotate90or270 ? img.width : img.height;
                tmpCtx.drawImage(img, -drawW / 2, -drawH / 2);

                // Now we have a rotated image at full resolution in tmpCanvas.
                // Next, we scale it down (or up) to the final requested size
                // (targetWidthPx x targetHeightPx), preserving aspect ratio.

                // aspect ratio of the rotated result
                const ratio = tmpCanvas.width / tmpCanvas.height;
                const targetRatio = targetWidthPx / targetHeightPx;
                let finalWidthPx, finalHeightPx;

                if (ratio > targetRatio) {
                    // relatively wider -> match targetWidthPx
                    finalWidthPx = targetWidthPx;
                    finalHeightPx = targetWidthPx / ratio;
                } else {
                    // relatively taller -> match targetHeightPx
                    finalHeightPx = targetHeightPx;
                    finalWidthPx = targetHeightPx * ratio;
                }

                // Create final canvas
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = Math.round(finalWidthPx);
                finalCanvas.height = Math.round(finalHeightPx);
                const finalCtx = finalCanvas.getContext('2d');

                // Draw the rotated image onto final canvas, scaled
                finalCtx.drawImage(
                    tmpCanvas,
                    0, 0,
                    finalCanvas.width,
                    finalCanvas.height
                );

                // Get a high-quality JPEG data URL
                const dataURL = finalCanvas.toDataURL('image/jpeg', 0.9);
                resolve(dataURL);
            };
        });
    };

    // Generate PDF with 2x2 grid, avoiding pixelation
    const generatePDF = async () => {
        if (images.length === 0) {
            alert('No images selected!');
            return;
        }

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = 210;
        const pageHeight = 297;

        // 2x2 per page
        const cols = 2;
        const rows = 2;
        const imagesPerPage = cols * rows; // 4

        // Each cell in mm
        const cellWidthMm = pageWidth / cols;   // 105
        const cellHeightMm = pageHeight / rows; // 148.5

        // Convert cell size from mm -> px, with a high DPI (e.g., 150 or 300)
        // This ensures a high-res canvas for each cell
        const dpi = 150; // Try 300 if you want even sharper images (bigger files)
        const cellWidthPx = mmToPx(cellWidthMm, dpi);     // ~105 * (150 / 25.4) => ~620 px
        const cellHeightPx = mmToPx(cellHeightMm, dpi);

        let indexInPage = 0;

        for (let i = 0; i < images.length; i++) {
            const { file, rotation } = images[i];
            const base64 = await fileToDataURL(file);

            // Rotate & scale to cell dimension in px, returns a dataURL
            const finalDataURL = await drawRotatedCanvas(base64, rotation, cellWidthPx, cellHeightPx);

            // Calculate row/col in the 2x2 grid
            const row = Math.floor(indexInPage / cols);
            const col = indexInPage % cols;

            // x, y in mm for placing in PDF
            const x = col * cellWidthMm;
            const y = row * cellHeightMm;

            // Place image in PDF at that cell, with size cellWidthMm x cellHeightMm
            pdf.addImage(finalDataURL, 'JPEG', x, y, cellWidthMm, cellHeightMm);

            indexInPage++;

            // If we filled this page (4 images) and still have more left, add new page
            if (indexInPage === imagesPerPage && i < images.length - 1) {
                pdf.addPage();
                indexInPage = 0;
            }
        }

        pdf.save('my-photos.pdf');
    };

    // ======== STYLES ======== //
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

    const hiddenInputStyle = { display: 'none' };

    const listStyle = {
        listStyle: 'none',
        margin: '20px 0',
        padding: 0,
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
            <h1>Pics2PDF (Avoid Pixelation)</h1>

            <div style={buttonRowStyle}>
                <button style={bigButtonStyle} onClick={() => cameraRef.current.click()}>
                    Take Photo(s)
                </button>
                <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    style={hiddenInputStyle}
                    onChange={handleFileChange}
                />

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
                            const rotateCSS = `rotate(${imgObj.rotation}deg)`;
                            return (
                                <li key={index} style={itemStyle}>
                                    <div style={leftStyle}>
                                        <img
                                            alt="thumb"
                                            src={fileURL}
                                            style={{ ...thumbStyle, transform: rotateCSS }}
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
