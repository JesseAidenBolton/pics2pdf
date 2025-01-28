import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
// (Optional) import an icon, e.g., from react-icons
// import { FaUpload } from 'react-icons/fa';

function App() {
    const [files, setFiles] = useState([]);

    // Helper to read File object as data URL
    const fileToDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    };

    // Update state when files change
    const handleFileChange = (e) => {
        setFiles(Array.from(e.target.files));
    };

    // Generate PDF
    const generatePDF = async () => {
        if (files.length === 0) {
            alert('No images selected!');
            return;
        }

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        for (let i = 0; i < files.length; i++) {
            const dataURL = await fileToDataURL(files[i]);
            if (i > 0) pdf.addPage();
            pdf.addImage(dataURL, 'JPEG', 0, 0, 210, 297);
        }

        pdf.save('my-photos.pdf');
    };

    // Inline styles (basic example)
    const containerStyle = {
        padding: '20px',
        fontFamily: 'sans-serif',
        maxWidth: '400px',
        margin: '0 auto',
    };

    const headingStyle = {
        textAlign: 'center',
        color: '#333',
    };

    const fileInputContainerStyle = {
        textAlign: 'center',
        margin: '20px 0',
    };

    const hiddenInputStyle = {
        display: 'none',
    };

    // A stylized button to open the file input
    const uploadButtonStyle = {
        display: 'inline-block',
        padding: '12px 24px',
        backgroundColor: '#6200ee',
        color: '#fff',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
    };

    const generateButtonStyle = {
        display: 'inline-block',
        padding: '12px 24px',
        backgroundColor: '#03dac6',
        color: '#000',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
    };

    return (
        <div style={containerStyle}>
            <h1 style={headingStyle}>Photos to PDF</h1>

            {/* Hidden file input */}
            <div style={fileInputContainerStyle}>
                <label htmlFor="file-upload" style={uploadButtonStyle}>
                    {/* You could use an icon here, e.g. <FaUpload /> */}
                    Select Photos
                </label>
                <input
                    id="file-upload"
                    style={hiddenInputStyle}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleFileChange}
                />
            </div>

            {/* Show how many files are selected */}
            {files.length > 0 && (
                <p style={{ textAlign: 'center' }}>{files.length} image(s) selected</p>
            )}

            {/* Button to generate PDF */}
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button style={generateButtonStyle} onClick={generatePDF}>
                    Generate PDF
                </button>
            </div>
        </div>
    );
}

export default App;
