import React, { useState, useRef } from 'react'
import { jsPDF } from 'jspdf'

function moveItem(arr, fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= arr.length) return arr; // no move if out of bounds
    const newArr = [...arr];
    const item = newArr.splice(fromIndex, 1)[0];
    newArr.splice(toIndex, 0, item);
    return newArr;
}

function App() {
    const [files, setFiles] = useState([]);

    const cameraRef = useRef(null);
    const galleryRef = useRef(null);

    // Add newly selected files to the array (so user can combine camera+gallery)
    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        setFiles((prev) => [...prev, ...newFiles]);
    };

    // Move an item up or down in the list
    const moveUp = (index) => {
        setFiles((prev) => moveItem(prev, index, index - 1));
    };

    const moveDown = (index) => {
        setFiles((prev) => moveItem(prev, index, index + 1));
    };

    // Convert file to data URL
    const fileToDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    };

    // Generate PDF with smaller bounding box
    const generatePDF = async () => {
        if (files.length === 0) {
            alert('No images selected!');
            return;
        }

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = 210;
        const pageHeight = 297;

        // bounding box smaller than full page to avoid "full-page stretch"
        const boundingWidth = 150;
        const boundingHeight = 100;

        for (let i = 0; i < files.length; i++) {
            const dataURL = await fileToDataURL(files[i]);

            // Load in an <img> to get actual width/height
            const img = new Image();
            img.src = dataURL;
            await new Promise((resolve) => { img.onload = resolve; });

            const imgWidth = img.width;
            const imgHeight = img.height;

            // aspect-ratio scaling to fit bounding box
            let finalWidth = boundingWidth;
            let finalHeight = boundingHeight;

            if (imgWidth / imgHeight > boundingWidth / boundingHeight) {
                // If the image is relatively wider, match boundingWidth and scale height
                finalHeight = (imgHeight / imgWidth) * boundingWidth;
            } else {
                // If the image is relatively taller, match boundingHeight and scale width
                finalWidth = (imgWidth / imgHeight) * boundingHeight;
            }

            // center that bounding box on the page
            const x = (pageWidth - finalWidth) / 2;
            const y = (pageHeight - finalHeight) / 2;

            if (i > 0) pdf.addPage();
            pdf.addImage(img, 'JPEG', x, y, finalWidth, finalHeight);
        }

        pdf.save('my-photos.pdf');
    };

    // ======= Basic Styles (mobile-friendly) ======= //
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

    const hiddenInputStyle = {
        display: 'none',
    };

    const buttonStyle = {
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
        ...buttonStyle,
        backgroundColor: '#03dac6',
        color: '#000',
        marginTop: '10px',
    };

    const thumbnailListStyle = {
        listStyle: 'none',
        padding: 0,
        margin: '20px 0',
    };

    const thumbnailItemStyle = {
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
    };

    const thumbnailImageStyle = {
        width: '60px',
        height: '60px',
        objectFit: 'cover',
        borderRadius: '4px',
    };

    const reorderButtonsStyle = {
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
                <button
                    style={buttonStyle}
                    onClick={() => cameraRef.current.click()}
                >
                    Take Photo(s)
                </button>
                <input
                    ref={cameraRef}
                    style={hiddenInputStyle}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleFileChange}
                />

                <button
                    style={buttonStyle}
                    onClick={() => galleryRef.current.click()}
                >
                    Select from Gallery
                </button>
                <input
                    ref={galleryRef}
                    style={hiddenInputStyle}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                />
            </div>

            {files.length > 0 && (
                <>
                    <p>{files.length} image(s) selected</p>
                    <ul style={thumbnailListStyle}>
                        {files.map((file, index) => {
                            const fileURL = URL.createObjectURL(file);
                            return (
                                <li key={index} style={thumbnailItemStyle}>
                                    <img src={fileURL} alt="thumb" style={thumbnailImageStyle} />
                                    <div style={reorderButtonsStyle}>
                                        <button
                                            style={smallButtonStyle}
                                            onClick={() => moveUp(index)}
                                        >
                                            Up
                                        </button>
                                        <button
                                            style={smallButtonStyle}
                                            onClick={() => moveDown(index)}
                                        >
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
