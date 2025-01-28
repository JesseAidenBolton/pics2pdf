import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';

function App() {
    const [files, setFiles] = useState([]);

    // Refs for two hidden file inputs
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    // Handle any file selection and merge with existing files
    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        setFiles((prev) => [...prev, ...newFiles]);
    };

    // Convert File object to Data URL
    const fileToDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    };

    // Generate PDF with correct aspect ratio
    const generatePDF = async () => {
        if (files.length === 0) {
            alert('No images selected!');
            return;
        }

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = 210;
        const pageHeight = 297;

        for (let i = 0; i < files.length; i++) {
            const dataURL = await fileToDataURL(files[i]);

            // Load image so we can measure its native width & height
            const img = new Image();
            img.src = dataURL;
            await new Promise((resolve) => {
                img.onload = resolve;
            });

            const imgWidth = img.width;
            const imgHeight = img.height;

            // Calculate final width/height to preserve aspect ratio within A4
            let finalWidth = pageWidth;
            let finalHeight = pageHeight;

            if (imgWidth / imgHeight > pageWidth / pageHeight) {
                // Image is relatively wider → match page width, scale height
                finalHeight = (imgHeight / imgWidth) * pageWidth;
            } else {
                // Image is relatively taller → match page height, scale width
                finalWidth = (imgWidth / imgHeight) * pageHeight;
            }

            // Center the image on the page
            const x = (pageWidth - finalWidth) / 2;
            const y = (pageHeight - finalHeight) / 2;

            // Add a new page for subsequent images
            if (i > 0) {
                pdf.addPage();
            }

            pdf.addImage(img, 'JPEG', x, y, finalWidth, finalHeight);
        }

        pdf.save('my-photos.pdf');
    };

    // ============== STYLES ============== //
    const containerStyle = {
        padding: '20px',
        fontFamily: 'sans-serif',
        maxWidth: '400px',
        margin: '0 auto',
        textAlign: 'center',
    };

    const headingStyle = {
        color: '#333',
    };

    // We'll create a container for the two buttons
    const buttonContainerStyle = {
        display: 'flex',
        flexDirection: 'column', // stack vertically on small screens
        gap: '10px',
        alignItems: 'center',
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
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
    };

    const buttonStyle2 = {
        ...buttonStyle,
        backgroundColor: '#03dac6',
        color: '#000',
        marginTop: '10px',
    };

    return (
        <div style={containerStyle}>
            <h1 style={headingStyle}>Pics2PDF</h1>

            {/* Button row for Camera vs. Gallery */}
            <div style={buttonContainerStyle}>
                {/* Take Photo(s) button */}
                <button
                    style={buttonStyle}
                    onClick={() => cameraInputRef.current.click()}
                >
                    Take Photo(s)
                </button>
                {/* Hidden file input for camera */}
                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    style={hiddenInputStyle}
                    onChange={handleFileChange}
                />

                {/* Select from Gallery button */}
                <button
                    style={buttonStyle}
                    onClick={() => galleryInputRef.current.click()}
                >
                    Select from Gallery
                </button>
                {/* Hidden file input for gallery */}
                <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={hiddenInputStyle}
                    onChange={handleFileChange}
                />
            </div>

            {/* Show how many total images selected */}
            {files.length > 0 && <p>{files.length} image(s) selected</p>}

            {/* Generate PDF Button */}
            <button style={buttonStyle2} onClick={generatePDF}>
                Generate PDF
            </button>
        </div>
    );
}

export default App;
