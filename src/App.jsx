import React, { useRef, useState } from 'react'
import { jsPDF } from 'jspdf'

function App() {
    const [files, setFiles] = useState([])

    // Create refs for each hidden file input
    const cameraInputRef = useRef(null)
    const galleryInputRef = useRef(null)

    // Unified handler when files are selected/taken
    const handleFileChange = (e) => {
        // Combine newly chosen files with existing ones if desired
        const newFiles = Array.from(e.target.files)
        setFiles((prev) => [...prev, ...newFiles])
    }

    // PDF generation logic
    const fileToDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.onerror = (err) => reject(err)
            reader.readAsDataURL(file)
        })
    }

    const generatePDF = async () => {
        if (files.length === 0) {
            alert('No images selected!')
            return
        }
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        for (let i = 0; i < files.length; i++) {
            const dataURL = await fileToDataURL(files[i])
            if (i > 0) pdf.addPage()
            // Example: fill entire A4
            pdf.addImage(dataURL, 'JPEG', 0, 0, 210, 297)
        }
        pdf.save('my-photos.pdf')
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>Pics2PDF</h1>

            {/* Buttons to open hidden inputs */}
            <div style={{ marginBottom: '20px' }}>
                <button onClick={() => cameraInputRef.current.click()}>Take Photo(s)</button>
                <button onClick={() => galleryInputRef.current.click()} style={{ marginLeft: '10px' }}>
                    Select from Gallery
                </button>
            </div>

            {/* Hidden file inputs */}
            {/* 1) Camera input (capture="environment") */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            {/* 2) Gallery input (no capture attribute) */}
            <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            {/* Display how many files have been selected */}
            <p>{files.length} image(s) selected</p>

            {/* Generate PDF button */}
            <button onClick={generatePDF}>Generate PDF</button>
        </div>
    )
}

export default App
