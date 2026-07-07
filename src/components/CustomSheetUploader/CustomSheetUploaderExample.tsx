import React, { useState } from 'react'
import {
  Box,
  Stack,
  Typography,
  Button
} from '@mui/material'
import { CustomSheetUploader } from './CustomSheetUploader'

export const CustomSheetUploaderExample: React.FC = () => {
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importedData, setImportedData] = useState<any[] | null>(null)

  const handleFileUpload = async (data: any[], file: File) => {
    console.log('Processing file upload:', file.name)
    console.log('Data received:', data)
    
    setImportStatus('processing')
    
    try {
      // Simulate database import (replace with your actual API call)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // In a real application, you would make an API call here:
      // const response = await fetch('/api/import-excel-data', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ 
      //     data,
      //     fileName: file.name,
      //     timestamp: new Date().toISOString()
      //   })
      // })
      // 
      // if (!response.ok) {
      //   throw new Error('Failed to import data to database')
      // }
      
      setImportedData(data)
      setImportStatus('success')
      
      console.log(`Successfully imported ${data.length} records from ${file.name}`)
      
    } catch (error) {
      console.error('Import failed:', error)
      setImportStatus('error')
      throw error // Re-throw to let the component handle error display
    }
  }

  const handleUploadError = (error: Error) => {
    console.error('Upload error:', error)
    setImportStatus('error')
  }

  return (
    <Box sx={{ maxWidth: 'md', mx: 'auto', p: 3 }}>
      <Stack direction="column" spacing={3}>
        <Box textAlign="center">
          <Typography variant="h4" component="h1" gutterBottom>
            Excel File Importer
          </Typography>
          <Typography color="textSecondary" variant="subtitle1">
            Upload your Excel files and import data directly to the database
          </Typography>
        </Box>

        <CustomSheetUploader
          onFileUpload={handleFileUpload}
          onError={handleUploadError}
          maxFileSize={15 * 1024 * 1024} // 15MB
          showPreview={true}
          maxPreviewRows={8}
          uploadMessage="Drop your Excel file here or click to browse"
          loadingMessage="Processing your Excel file..."
        />

        {/* Status Display */}
        {importStatus === 'processing' && (
          <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1, border: '1px solid', borderColor: 'info.main' }}>
            <Typography fontWeight="bold" color="info.dark">Processing...</Typography>
            <Typography color="info.dark">
              Your data is being imported to the database. Please wait.
            </Typography>
          </Box>
        )}

        {importStatus === 'success' && importedData && (
          <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1, border: '1px solid', borderColor: 'success.main' }}>
            <Typography fontWeight="bold" color="success.dark">Import Complete!</Typography>
            <Typography color="success.dark">
              Successfully imported {importedData.length} records to the database.
            </Typography>
          </Box>
        )}

        {importStatus === 'error' && (
          <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1, border: '1px solid', borderColor: 'error.main' }}>
            <Typography fontWeight="bold" color="error.dark">Import Failed</Typography>
            <Typography color="error.dark">
              There was an error importing your data. Please check the file and try again.
            </Typography>
          </Box>
        )}

        {/* Data Summary */}
        {importedData && (
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'grey.200',
              borderRadius: 1,
              p: 2,
              bgcolor: 'grey.50'
            }}
          >
            <Typography variant="h6" component="h3" gutterBottom>
              Import Summary
            </Typography>
            <Stack direction="column" spacing={1} alignItems="flex-start">
              <Typography><strong>Total Records:</strong> {importedData.length}</Typography>
              <Typography><strong>Columns:</strong> {importedData.length > 0 ? Object.keys(importedData[0]).length : 0}</Typography>
              <Typography><strong>Import Time:</strong> {new Date().toLocaleString()}</Typography>
              {importedData.length > 0 && (
                <Box>
                  <Typography><strong>Column Names:</strong></Typography>
                  <Typography variant="body2" color="textSecondary">
                    {Object.keys(importedData[0]).join(', ')}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  )
}
