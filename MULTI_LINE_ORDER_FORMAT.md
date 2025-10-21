# Multi-Line Order Format Support

## Overview
The application now supports two formats for inputting phone numbers and data allocations:

### 1. Single-Line Format (Original)
```
0244987337 2gb
0556789012 4gb
0201234567 15gb
```

### 2. Multi-Line Format (NEW)
```
0244987337
2gb

0556789012
4gb

0201234567
15gb
```

## How It Works

### Detection Logic
The enhanced parsing logic automatically detects the format:

1. **Single-Line Detection**: If a line contains both a phone number and data allocation separated by whitespace
2. **Multi-Line Detection**: If a line contains only a phone number (starting with 0, 9-10 digits) and the next line contains only a data allocation

### Processing Features
- ✅ **Automatic Format Detection**: No need to specify format
- ✅ **Mixed Format Support**: Can handle both formats in the same input
- ✅ **Phone Number Validation**: Validates Kenyan phone number format (0xxxxxxxxx)
- ✅ **Data Allocation Validation**: Ensures positive numeric values
- ✅ **Duplicate Detection**: Identifies duplicates based on phone + allocation combination
- ✅ **Auto-Fix**: Automatically corrects common phone number issues

### Examples

#### Valid Multi-Line Input:
```
0244987337
2gig

0556789012

4gb

0201234567
15
```

#### Valid Mixed Format Input:
```
0244987337 2gb
0556789012
4gb
0201234567 15gb
```

## Where This Works

### 1. Send Orders Page (`/packages`)
- Manual text input textarea
- Supports both formats in the same input

### 2. Main Bundle Allocator (`/`)
- Data processing textarea
- Supports both formats in the same input

### 3. Excel File Upload
- Both pages also support Excel file uploads
- Excel files should use single-line format (phone in column A, data in column B)

## Technical Implementation

### Enhanced Parsing Algorithm:
1. **Pre-processing**: Split input into lines, remove empty lines
2. **Format Detection**: For each line, check if it's single-line or multi-line format
3. **Multi-Line Pairing**: If a line looks like a phone number, check if next line is data allocation
4. **Validation**: Apply phone number and data allocation validation
5. **Duplicate Removal**: Remove duplicates based on phone + allocation combination
6. **Error Handling**: Skip invalid entries with detailed logging

### Validation Rules:
- **Phone Numbers**: Must start with 0, be 9-10 digits, Kenyan format
- **Data Allocations**: Must be positive numbers (supports decimal values)
- **Auto-Fix**: Adds leading zeros, removes non-digit characters from phone numbers

### Error Prevention:
- Detects when phone numbers are mistakenly interpreted as data allocations
- Validates data allocation ranges to prevent unrealistic values (e.g., 244987337 GB)
- Provides clear console logging for debugging

## Benefits

1. **User Flexibility**: Users can input data in the format most convenient for them
2. **Backwards Compatibility**: Existing single-line format continues to work
3. **Error Reduction**: Enhanced validation prevents common input mistakes
4. **Better UX**: Clear placeholder text shows both format examples
5. **Robust Processing**: Handles mixed formats and edge cases gracefully

## Usage Examples

### Scenario 1: WhatsApp Copy-Paste
When users copy phone numbers and data allocations from WhatsApp or other sources where they might be on separate lines:

```
Contact 1:
0244987337
2gig please

Contact 2:
0556789012
Need 4gb
```

Simply paste as:
```
0244987337
2
0556789012
4
```

### Scenario 2: Excel Copy with Line Breaks
When copying from Excel and the data ends up on separate lines:
```
0244987337
2
0556789012
4
0201234567
15
```

### Scenario 3: Mixed Sources
When combining data from different sources:
```
0244987337 2gb
0556789012
4gb
0201234567 15
```

All these formats will be processed correctly by the application.