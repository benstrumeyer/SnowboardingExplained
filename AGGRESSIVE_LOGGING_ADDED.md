# Aggressive Logging Added to `/api/finalize-upload` Endpoint

## Overview
Added comprehensive logging throughout the `/api/finalize-upload` endpoint to diagnose why video processing isn't working. Every major step now has detailed console output.

## Logging Points Added

### 1. **Endpoint Entry** (Line ~404)
```
[FINALIZE] 🚀 FINALIZE-UPLOAD ENDPOINT CALLED
[FINALIZE] Request body: <full request body>
[FINALIZE] VALIDATION FAILED: role=<role>, sessionId=<sessionId>
```

### 2. **Chunk Assembly** (Lines ~420-470)
```
[FINALIZE] 📦 CHUNK ASSEMBLY STARTING
[FINALIZE] CHUNK_SIZE: <size> bytes
[FINALIZE] Total chunks expected: <count>
[FINALIZE] Chunks directory: <path>
[FINALIZE] Chunks directory exists: <true/false>
[FINALIZE] Output video path: <path>
[FINALIZE] Upload directory exists: <true/false>
[FINALIZE] 📥 Chunk <i>/<total>: <path>
[FINALIZE]   ✓ Read chunk <i>: <size> bytes
[FINALIZE]   ✓ Wrote chunk <i>/<total> (total: <size>)
[FINALIZE]   ✓ Deleted chunk file
[FINALIZE] ✓ Write stream finished
[FINALIZE] ✓ Video assembled: <path> (<size> bytes)
[FINALIZE] File exists after assembly: <true/false>
[FINALIZE] File size on disk: <size> bytes
```

### 3. **Flask API Call Preparation** (Lines ~475-495)
```
[FINALIZE] 🚀 PHASE 3: Calling Flask wrapper /pose/video endpoint
[FINALIZE] Flask wrapper URL: <url>
[FINALIZE] Video path to send: <path>
[FINALIZE] Video file exists: <true/false>
[FINALIZE] Video file size: <size> bytes
[FINALIZE] POSE_SERVICE_URL env var: <url or NOT SET>
[FINALIZE] 📤 Sending POST request to <url>
[FINALIZE] Request payload: <json>
[FINALIZE] Request timeout: 300000ms (5 minutes)
```

### 4. **Flask API Response** (Lines ~500-510)
```
[FINALIZE] ✓ Flask wrapper returned HTTP <status> (took <ms>ms)
[FINALIZE] Response data keys: <keys>
[FINALIZE] Response frames count: <count>
[FINALIZE] Response data sample: <first 500 chars>
```

### 5. **Flask Response Parsing** (Lines ~515-545)
```
[FINALIZE] 📊 PARSING FLASK RESPONSE
[FINALIZE] Flask data type: <type>
[FINALIZE] Flask data keys: <keys>
[FINALIZE] Has frames array: <true/false>
[FINALIZE] Frames is array: <true/false>
[FINALIZE] Frames length: <count>
[FINALIZE] ✓ Processing <count> frames from Flask response
[FINALIZE]   Frame <idx>: keys=<keys>, persons=<count>
[FINALIZE] ✓ Converted <count> frames from Flask format
[FINALIZE] First frame mesh data: vertices=<count>, faces=<count>
[FINALIZE] ✗ CRITICAL: Flask response missing frames array
[FINALIZE] Flask response: <first 1000 chars>
```

### 6. **Flask Error Handling** (Lines ~550-580)
```
[FINALIZE] ========================================
[FINALIZE] ✗✗✗ FLASK WRAPPER FAILED ✗✗✗
[FINALIZE] Error type: <ErrorType>
[FINALIZE] Error message: <message>
[FINALIZE] Error code: <code>
[FINALIZE] Error errno: <errno>
[FINALIZE] HTTP Status: <status>
[FINALIZE] HTTP Headers: <headers>
[FINALIZE] HTTP Data: <first 500 chars>
[FINALIZE] No HTTP response (network error)
[FINALIZE] Request URL: <url>
[FINALIZE] Request method: <method>
[FINALIZE] Request timeout: <ms>
[FINALIZE] Full error stack: <stack>
[FINALIZE] ========================================
```

### 7. **MongoDB Save Preparation** (Lines ~585-605)
```
[FINALIZE] 💾 SAVING TO MONGODB
[FINALIZE] Mesh sequence length: <count>
[FINALIZE] Video ID: <id>
[FINALIZE] Role: <role>
[FINALIZE] 🔍 MESH DATA DEBUG before save:
[FINALIZE]   First frame mesh_vertices_data exists: <true/false>
[FINALIZE]   First frame mesh_vertices_data length: <count>
[FINALIZE]   First frame mesh_faces_data exists: <true/false>
[FINALIZE]   First frame mesh_faces_data length: <count>
[FINALIZE]   First vertex: <json>
[FINALIZE] ⚠️  WARNING: meshSequence is empty!
```

### 8. **MongoDB Connection & Save** (Lines ~610-640)
```
[FINALIZE] 🔗 Connecting to MongoDB...
[FINALIZE] ✓ Connected to MongoDB
[FINALIZE] 📝 About to save mesh data for <videoId>
[FINALIZE] Mesh data: <frameCount> frames, fps: <fps>
[FINALIZE] 📊 First frame TO SAVE:
[FINALIZE]   mesh_vertices_data length: <count>
[FINALIZE]   mesh_faces_data length: <count>
[FINALIZE] 💾 Calling meshDataService.saveMeshData()...
[FINALIZE] ✓ Stored mesh data in MongoDB for <videoId> (took <ms>ms)
[FINALIZE] Saved <count> frames to MongoDB
[FINALIZE] ✗ CRITICAL ERROR saving mesh data: <error>
[FINALIZE] Error type: <ErrorType>
[FINALIZE] Error message: <message>
[FINALIZE] Error stack: <stack>
```

### 9. **Success Response** (Lines ~645-655)
```
[FINALIZE] ========================================
[FINALIZE] ✓✓✓ FINALIZE-UPLOAD COMPLETE ✓✓✓
[FINALIZE] Video ID: <id>
[FINALIZE] Frames processed: <count>
[FINALIZE] ========================================
```

### 10. **Outer Error Handling** (Lines ~660-670)
```
[FINALIZE] ========================================
[FINALIZE] ✗✗✗ OUTER CATCH BLOCK - FINALIZE UPLOAD FAILED ✗✗✗
[FINALIZE] Error type: <ErrorType>
[FINALIZE] Error message: <message>
[FINALIZE] Error stack: <stack>
[FINALIZE] ========================================
```

## What This Logging Will Help Diagnose

1. **Request validation** - Is the request reaching the endpoint with correct data?
2. **Chunk assembly** - Are all chunks being found and assembled correctly?
3. **File I/O** - Does the video file exist after assembly?
4. **Flask connectivity** - Can we reach the Flask service?
5. **Flask response** - What is Flask actually returning?
6. **Response parsing** - Is the response in the expected format?
7. **Error details** - Exact error messages, types, and stack traces
8. **MongoDB operations** - Is the data being saved successfully?
9. **Performance** - How long does each operation take?

## How to Use

1. Start the backend server
2. Upload a video through the UI
3. Check the backend console output for `[FINALIZE]` prefixed logs
4. Follow the flow from start to finish to identify where the issue occurs
5. The logs will show exact error messages, HTTP status codes, and data structures

## Key Indicators to Look For

- ✓ = Success
- ✗ = Error/Failure
- 🚀 = Starting a major phase
- 📦 = Chunk operations
- 📤 = Sending data
- 📊 = Parsing/analyzing data
- 💾 = Database operations
- 🔗 = Connection operations
- ⚠️ = Warnings

## Files Modified

- `SnowboardingExplained/backend/src/server.ts` - `/api/finalize-upload` endpoint (lines 404-670)
