import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';

// Helper: move an item in an array from one index to another
function moveItem(arr, fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= arr.length) return arr; // out of bounds
    const newArr = [...arr];
    const item = newArr.splice(fromIndex, 1)[0];
    newArr.splice(toIndex, 0, item);
    return newArr;
}

function App() {
    // Instead of just storing Files, we'll store objects: { file, rotation }
    // so we can keep track of each image's rotation
    const [images, setImages] = useState([]);

    const cameraRef = useRef(null);
    const galleryRef = useRef(null);

    // Add newly selected files
    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files).map((f) => ({
            file: f,
            rotation: 0, // default rotation
        }));
        // Merge with existing
        setImages((prev) => [...prev, ...newFiles]);
    };

    // Rotate an image in 90-degree increments
    const rotateImage = (index) => {
        setImages((prev) => {
            const updated = [...prev];
            // increment rotation by 90°, wrap around at 360
            updated[index].rotation = (updated[index].rotation + 90) % 360;
            return updated;
        });
    };

    // Move image up/down
    const moveUp = (index) => {
        setImages((prev) => moveItem(prev, index, index - 1));
    };

    const moveDown = (index) => {
        setImages((prev) => moveItem(prev, index, index + 1));
    };

    // Convert file to Data URL
    const fileToDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    };

    // Generate PDF with proper orientation & scaling
    const generatePDF = async () => {
        if (images.length === 0) {
            alert('No images selected!');
            return;
        }

        const pdf = new jsPDF({
            orientation: 'portrait', // we can keep the page itself portrait
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = 210;
        const pageHeight = 297;

        for (let i = 0; i < images.length; i++) {
            const { file, rotation } = images[i];

            // Load file as data URL
            const dataURL = await fileToDataURL(file);

            // Create <img> so we can measure its width/height
            const img = new Image();
            img.src = dataURL;
            await new Promise((resolve) => {
                img.onload = resolve;
            });

            // The "natural" image size
            let imgWidth = img.width;
            let imgHeight = img.height;

            // If rotating 90 or 270, the effective width/height is swapped
            // because it's turned sideways
            const rot = rotation % 180; // only care if it's 0/180 or 90/270
            if (rot !== 0) {
                // swap
                [imgWidth, imgHeight] = [imgHeight, imgWidth];
            }

            // We'll scale to fit the full page, but preserve aspect ratio
            let finalWidth = pageWidth;
            let finalHeight = pageHeight;

            if (imgWidth / imgHeight > pageWidth / pageHeight) {
                // If image is relatively wider → match pageWidth, scale height
                finalHeight = (imgHeight / imgWidth) * pageWidth;
            } else {
                // If image is relatively taller → match pageHeight, scale width
                finalWidth = (imgWidth / imgHeight) * pageHeight;
            }

            // Center the image on the page
            const x = (pageWidth - finalWidth) / 2;
            const y = (pageHeight - finalHeight) / 2;

            // If not first image, add page
            if (i > 0) {
                pdf.addPage();
            }

            // The 9th param in addImage is rotation in degrees
            // jsPDF rotates around the image's center
            pdf.addImage(
                img,           // image data
                'JPEG',
                x,
                y,
                finalWidth,
                finalHeight,
                undefined,     // alias
                undefined,     // compression
                rotation       // rotate degrees
            );
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
        gap: '10px',
        marginBottom: '20px',
        alignItems: 'center',
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

    const imageListStyle = {
        listStyle: 'none',
        padding: 0,
        margin: '20px 0',
    };

    const imageItemStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
    };

    const thumbnailContainerStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    };

    const thumbnailStyle = {
        width: '60px',
        height: '60px',
        objectFit: 'cover',
        borderRadius: '4px',
        // We'll also rotate the thumbnail in the UI using CSS
    };

    const smallButtonContainerStyle = {
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
            <h1>Pics2PDF</h1>

            <div style={buttonRowStyle}>
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
                    <ul style={imageListStyle}>
                        {images.map((imgObj, index) => {
                            const fileURL = URL.createObjectURL(imgObj.file);
                            // We'll rotate the thumbnail in UI using CSS transform
                            const rotationCSS = `rotate(${imgObj.rotation}deg)`;

                            return (
                                <li key={index} style={imageItemStyle}>
                                    <div style={thumbnailContainerStyle}>
                                        <img
                                            src={fileURL}
                                            alt="preview"
                                            style={{
                                                ...thumbnailStyle,
                                                transform: rotationCSS
                                            }}
                                        />
                                    </div>
                                    <div style={smallButtonContainerStyle}>
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
