"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Upload, Download, CheckCircle, AlertCircle, Loader, FileText, DollarSign } from "lucide-react";
import ExcelJS from "exceljs";
import { addOrder } from "../lib/orderClient";
import { useOrderCount } from "../lib/orderContext";
import { useSession } from "next-auth/react";
import { notifyOrderSent, notifyCountUpdated } from "../lib/orderNotifications";
import { getCurrentUserPricing, calculatePrice } from "../lib/pricingClient";
import { getCurrentTimeSync, getCurrentDateStringSync, getCurrentTimeStringSync, getCurrentTimestampSync } from "../lib/timeService";
import { validateOrderPricing, hasPricingForAllocation } from "../lib/entryCostCalculator";
import OrderHaltBanner from "./OrderHaltBanner";
import { useOrderHaltStatus } from "@/hooks/useOrderHaltStatus";

type OrderStatus = "idle" | "preparing" | "sending" | "success" | "error";

type OrderEntry = {
  number: string;
  allocationGB: number;
  status?: "pending" | "sent" | "error";
  message?: string;
  isValid?: boolean;
  wasFixed?: boolean;
  isDuplicate?: boolean;
  cost?: number | null;
};

// Helper functions to save and load order entries from localStorage
const SEND_ORDER_STORAGE_KEY = 'send-order-entries';
const SEND_ORDER_TEXT_KEY = 'send-order-text';

const saveOrderEntriesToStorage = (entries: OrderEntry[], manualText: string) => {
  try {
    localStorage.setItem(SEND_ORDER_STORAGE_KEY, JSON.stringify(entries));
    localStorage.setItem(SEND_ORDER_TEXT_KEY, manualText);
  } catch (error) {
    // // Console statement removed for security
  }
};

const loadOrderEntriesFromStorage = (): { entries: OrderEntry[], manualText: string } => {
  try {
    const entriesJson = localStorage.getItem(SEND_ORDER_STORAGE_KEY);
    const manualText = localStorage.getItem(SEND_ORDER_TEXT_KEY) || '';
    
    if (entriesJson) {
      return { 
        entries: JSON.parse(entriesJson),
        manualText 
      };
    }
  } catch (error) {
    // // Console statement removed for security
  }
  
  return { entries: [], manualText: '' };
};

export default function SendOrderApp() {
  const [orderEntries, setOrderEntries] = useState<OrderEntry[]>([]);
  const [status, setStatus] = useState<OrderStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [manualInputText, setManualInputText] = useState<string>("");
  const [inputMethod, setInputMethod] = useState<"file" | "manual">("file");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pricingData, setPricingData] = useState<any>(null);
  const [totalCost, setTotalCost] = useState<number | null>(null);
  const [loadingPricing, setLoadingPricing] = useState<boolean>(false);
  const [minimumOrderEntries, setMinimumOrderEntries] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const invalidEntryRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Get the current session to retrieve user information
  const { data: session } = useSession();
  // Get the refreshOrderCount function from context
  const { refreshOrderCount } = useOrderCount();
  // Check order halt status
  const { ordersHalted, message } = useOrderHaltStatus();
  
  // Load saved order entries and manual text from localStorage on component mount
  useEffect(() => {
    const { entries, manualText } = loadOrderEntriesFromStorage();
    
    if (entries.length > 0) {
      setOrderEntries(entries);
      // If there was manual text saved, switch to manual input mode
      if (manualText) {
        setManualInputText(manualText);
        setInputMethod("manual");
      }
    }
  }, []);
  
  // Fetch the user's pricing profile and minimum entries requirement
  useEffect(() => {
    async function loadUserPricing() {
      try {
        setLoadingPricing(true);
        const data = await getCurrentUserPricing();
        setPricingData(data);
        // // Console log removed for security
      } catch (error) {
        // // Console statement removed for security
      } finally {
        setLoadingPricing(false);
      }
    }
    
    async function loadUserSettings() {
      try {
        const response = await fetch('/api/user/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setMinimumOrderEntries(data.settings.minimumOrderEntries || 1);
          }
        }
      } catch (error) {
        // // Console statement removed for security
      }
    }
    
    if (session?.user) {
      loadUserPricing();
      loadUserSettings();
    }
  }, [session?.user]);

  // Function to read Excel (.xlsx) files
  // Enhanced validation function that ensures each character is a digit and phone number has exactly 10 digits
  // With auto-fix capabilities for common issues including removal of dots and hyphens
  const validateNumber = (num: string): { isValid: boolean; correctedNumber: string; wasFixed: boolean } => {
    // Handle empty strings or nulls
    if (!num || typeof num !== 'string' || num.trim() === '') {
      // // Console log removed for security
      return { isValid: false, correctedNumber: num || '', wasFixed: false };
    }
    
    // Strip any non-digit characters (including dots, hyphens, spaces)
    const digitsOnly = num.replace(/[^\d]/g, '');
    let wasFixed = false;
    
    // Check if there were non-digits that we stripped
    if (digitsOnly.length !== num.length) {
      wasFixed = true;
      // // Console log removed for security
    }
    
    // First case: Already valid 10 digits starting with 0
    if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
      return { isValid: true, correctedNumber: digitsOnly, wasFixed: wasFixed };
    }
    
    // Second case: 9 digits - try adding a leading zero (only if it doesn't already start with 0)
    if (digitsOnly.length === 9) {
      // Don't add extra 0 if it already starts with 0
      if (digitsOnly.startsWith('0')) {
        // // Console log removed for security
        return { isValid: false, correctedNumber: digitsOnly, wasFixed: wasFixed };
      }
      const withZero = '0' + digitsOnly;
      // // Console log removed for security
      return { isValid: true, correctedNumber: withZero, wasFixed: true };
    }
    
    // Third case: 10 digits but doesn't start with 0 - replace first digit with 0
    if (digitsOnly.length === 10 && !digitsOnly.startsWith('0')) {
      const withZero = '0' + digitsOnly.substring(1);
      // // Console log removed for security
      return { isValid: true, correctedNumber: withZero, wasFixed: true };
    }
    
    // Invalid cases - number doesn't match required pattern and can't be fixed
    // Log specific reasons for debugging
    if (digitsOnly.length < 9) {
      // // Console log removed for security
    } else if (digitsOnly.length > 10) {
      // // Console log removed for security
    } else {
      // // Console log removed for security
    }
    
    // Return as invalid with the original digits-only string
    return { isValid: false, correctedNumber: digitsOnly, wasFixed: wasFixed };
  };

  // Comprehensive validation function that requires both valid phone number AND valid data allocation
  const validateEntry = (phoneNumber: string, dataAllocation: number): { 
    isValid: boolean; 
    phoneValidation: { isValid: boolean; correctedNumber: string; wasFixed: boolean };
    allocationValid: boolean;
    reason?: string;
  } => {
    const phoneValidation = validateNumber(phoneNumber);
    const allocationValid = !isNaN(dataAllocation) && dataAllocation > 0;
    
    // Entry is only valid if BOTH phone number AND data allocation are valid
    const isValid = phoneValidation.isValid && allocationValid;
    
    let reason = '';
    if (!phoneValidation.isValid && !allocationValid) {
      if (dataAllocation === 0) {
        reason = 'Invalid phone number and missing data allocation';
      } else {
        reason = 'Invalid phone number and data allocation';
      }
    } else if (!phoneValidation.isValid) {
      reason = 'Invalid phone number';
    } else if (!allocationValid) {
      if (dataAllocation === 0) {
        reason = 'Missing data allocation';
      } else {
        reason = 'Invalid data allocation (must be greater than 0)';
      }
    }
    
    return {
      isValid,
      phoneValidation,
      allocationValid,
      reason
    };
  };

  // Enhanced function to parse data allocation with various formats
  const parseDataAllocation = (allocRaw: string): { allocGB: number; wasConverted: boolean; originalFormat: string } => {
    const originalFormat = allocRaw;
    let allocValue = 0;
    let wasConverted = false;
    
    // Normalize the input - remove spaces and convert to lowercase
    const normalized = allocRaw.toLowerCase().trim();
    
    // Handle different formats
    if (/^\d+(\.\d+)?gig(s|abyte|abytes)?$/i.test(normalized)) {
      // Format: "25gig", "25gigs", "25gigabyte", "25gigabytes"
      allocValue = parseFloat(normalized.replace(/gig.*$/i, ""));
    } else if (/^\d+(\.\d+)?gb$/i.test(normalized)) {
      // Format: "8gb", "1.5gb"
      allocValue = parseFloat(normalized.replace(/gb$/i, ""));
    } else if (/^\d+(\.\d+)?g$/i.test(normalized)) {
      // Format: "2g", "5.5g"
      allocValue = parseFloat(normalized.replace(/g$/i, ""));
    } else if (/^\d+(\.\d+)?mb$/i.test(normalized)) {
      // Format: "1024mb", "512mb" - convert MB to GB
      const mbValue = parseFloat(normalized.replace(/mb$/i, ""));
      allocValue = mbValue / 1024;
      wasConverted = true;
    } else if (/^\d+(\.\d+)?m$/i.test(normalized)) {
      // Format: "1024m", "512m" - convert MB to GB
      const mbValue = parseFloat(normalized.replace(/m$/i, ""));
      allocValue = mbValue / 1024;
      wasConverted = true;
    } else if (/^\d+(\.\d+)?$/.test(normalized)) {
      // Format: "3", "25", "1.5" - assume GB if no unit
      allocValue = parseFloat(normalized);
    } else {
      // Try to extract just the numeric part as fallback
      const numericMatch = normalized.match(/^(\d+(?:\.\d+)?)/);
      if (numericMatch) {
        allocValue = parseFloat(numericMatch[1]);
      }
    }
    
    return {
      allocGB: allocValue,
      wasConverted,
      originalFormat
    };
  };

  // Process manual text input with duplicate detection
  const processManualInput = (text: string): OrderEntry[] => {
    setManualInputText(text);
    
    if (!text.trim()) {
      return [];
    }
    
    try {
      setIsProcessing(true);
      
      const rawLines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== "");

      // Enhanced parsing to handle both single-line and multi-line formats
      const processedEntries: Array<{phoneRaw: string, allocRaw: string, allocGB: number}> = [];
      
      // First, try to parse as single-line format (phone and data on same line)
      // Then handle multi-line format (phone on one line, data on next line)
      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        const parts = line.trim().split(/\s+/);
        
        // Check if this line has both phone and allocation (single-line format)
        if (parts.length >= 2) {
          const phoneRaw = parts[0];
          const allocRawInput = parts[parts.length - 1].trim();
          
          // Use enhanced parsing for data allocation
          const allocationResult = parseDataAllocation(allocRawInput);
          
          // Check for phone number misinterpretation bug
          if (!(allocationResult.allocGB >= 10000000 && allocationResult.allocGB <= 999999999 && allocRawInput.startsWith('0') && allocRawInput.length === 10)) {
            if (!isNaN(allocationResult.allocGB) && allocationResult.allocGB > 0) {
              processedEntries.push({ 
                phoneRaw, 
                allocRaw: allocRawInput,
                allocGB: allocationResult.allocGB 
              });
              continue;
            } else {
              // Include entries with invalid/missing data allocation so they can be flagged as invalid
              processedEntries.push({ 
                phoneRaw, 
                allocRaw: allocRawInput,
                allocGB: 0 // This will be flagged as invalid
              });
              continue;
            }
          }
        }
        // Check if this line has only a phone number (missing data allocation)
        else if (parts.length === 1) {
          const phoneRaw = parts[0];
          
          // Check if this looks like a phone number
          if (/^0\d{8,9}$/.test(phoneRaw)) {
            // Check if next line might be data allocation (multi-line format)
            if (i + 1 < rawLines.length) {
              const nextLine = rawLines[i + 1].trim();
              const nextParts = nextLine.split(/\s+/);
              
              // Check if next line could be data allocation
              if (nextParts.length === 1) {
                const possibleAllocInput = nextParts[0].trim();
                
                // Use enhanced parsing for data allocation
                const allocationResult = parseDataAllocation(possibleAllocInput);
                
                // Make sure it's not a phone number misinterpreted as allocation
                if (!(allocationResult.allocGB >= 10000000 && allocationResult.allocGB <= 999999999 && possibleAllocInput.startsWith('0') && possibleAllocInput.length === 10)) {
                  if (!isNaN(allocationResult.allocGB) && allocationResult.allocGB > 0) {
                    processedEntries.push({ 
                      phoneRaw: phoneRaw, 
                      allocRaw: possibleAllocInput, 
                      allocGB: allocationResult.allocGB 
                    });
                    i++; // Skip the next line since we've processed it
                    continue;
                  } else {
                    // Invalid data allocation in multi-line format
                    processedEntries.push({ 
                      phoneRaw: phoneRaw, 
                      allocRaw: possibleAllocInput, 
                      allocGB: 0 
                    });
                    i++; // Skip the next line since we've processed it
                    continue;
                  }
                }
              }
            }
            
            // Phone number without data allocation (single line or end of input)
            processedEntries.push({ 
              phoneRaw, 
              allocRaw: '', // Empty allocation
              allocGB: 0 // This will be flagged as invalid
            });
            continue;
          }
        }

        
        // // Console log removed for security
      }
      
      // First pass: collect all phone number + allocation combinations and identify duplicates
      const phoneAllocCombinations = new Set<string>();
      const duplicates = new Set<string>();
      let fixedNumbers = 0;
      
      processedEntries.forEach(({phoneRaw, allocRaw, allocGB}) => {
        const validation = validateNumber(phoneRaw);
        const finalPhoneNumber = validation.correctedNumber;
        
        if (validation.wasFixed) {
          fixedNumbers++;
        }
        
        // Create unique key combining phone number AND allocation
        const uniqueKey = `${finalPhoneNumber}-${allocGB}`;
        
        if (phoneAllocCombinations.has(uniqueKey)) {
          duplicates.add(uniqueKey);
        } else {
          phoneAllocCombinations.add(uniqueKey);
        }
      });
      
      // Second pass: create entries with duplicate flag and validation results
      // Only keep the first occurrence of each phone number + allocation combination
      const parsed: OrderEntry[] = [];
      const seenCombinations = new Set<string>();
      let totalDuplicates = 0;
      
      processedEntries.forEach(({phoneRaw, allocRaw, allocGB}) => {
        // Use comprehensive validation that checks both phone number AND data allocation
        const entryValidation = validateEntry(phoneRaw, allocGB);
        // // Console log removed for security
        
        const uniqueKey = `${entryValidation.phoneValidation.correctedNumber}-${allocGB}`;
        
        // Only add if this is the first occurrence of this combination
        if (!seenCombinations.has(uniqueKey)) {
          seenCombinations.add(uniqueKey);
          
          // Double check validity here with regex
          const isValidNumber = /^0\d{9}$/.test(entryValidation.phoneValidation.correctedNumber);
          
          // Final validation combines all checks: phone number format, validation function, AND data allocation
          const finalValid = isValidNumber && entryValidation.isValid;
          
          const entry = {
            number: entryValidation.phoneValidation.correctedNumber,
            allocationGB: allocGB,
            status: "pending" as "pending",
            isValid: finalValid, // Use comprehensive validation that requires both phone AND allocation
            wasFixed: entryValidation.phoneValidation.wasFixed,
            isDuplicate: false // No entries are marked as duplicate since we remove them
          };
          
          parsed.push(entry);
          
          // Log validation details for debugging if needed
          if (!finalValid) {
            // Entry marked invalid - logging removed for security
          }
        } else {
          // Count duplicates that are removed
          totalDuplicates++;
        }
      });
      
      // Show alerts for removed duplicates and fixed numbers
      const alertMessages: string[] = [];
      
      if (totalDuplicates > 0) {
        alertMessages.push(`Removed ${totalDuplicates} duplicate entry(ies).\n\nDuplicates are identified by matching both phone number AND data allocation.\nOnly the first occurrence of each combination was kept.`);
      }
      
      if (fixedNumbers > 0) {
        alertMessages.push(`Auto-fixed ${fixedNumbers} phone number(s) by:\n• Removing dots, hyphens, and non-digit characters\n• Adding leading zeros where needed\n• Fixing number format\n\nFixed numbers are marked with a cyan icon.`);
      }
      
      if (alertMessages.length > 0) {
        window.alert && window.alert(alertMessages.join('\n\n'));
      }
      
      return parsed;
    } catch (error) {
      // Console statement removed for security
      return [];
    } finally {
      setIsProcessing(false);
    }
  };

  // Count all non-header data lines in an Excel file
  const countLinesInExcelFile = async (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          
          let count = 0;
          
          workbook.eachSheet((worksheet) => {
            // Skip first row if it's a header
            let isFirstRow = true;
            
            worksheet.eachRow((row) => {
              if (isFirstRow) {
                isFirstRow = false;
                // Check if this looks like a header row
                const firstCell = row.getCell(1).text?.toLowerCase() || '';
                if (firstCell.includes('msisdn') || firstCell.includes('number') || firstCell.includes('beneficiary')) {
                  return; // Skip header row
                }
              }
              
              const phoneNumber = row.getCell(1).text || '';
              let dataAllocation = 0;
              
              // Try to get data allocation from column 4 (Data MB column)
              if (row.getCell(4).text) {
                const mbValue = parseFloat(row.getCell(4).text);
                if (!isNaN(mbValue)) {
                  dataAllocation = mbValue / 1024;
                }
              }
              
              if (phoneNumber && dataAllocation > 0) {
                count++;
              }
            });
          });
          
          resolve(count);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };
  
  const readExcelFile = async (file: File): Promise<OrderEntry[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          
          // First, collect all entries for duplicate detection
          const tempEntries: Array<{phoneNumber: string, dataAllocation: number, validation: ReturnType<typeof validateNumber>}> = [];
          let fixedNumbers = 0;
          
          workbook.eachSheet((worksheet) => {
            // Skip first row if it's a header
            let isFirstRow = true;
            
            worksheet.eachRow((row) => {
              if (isFirstRow) {
                isFirstRow = false;
                // Check if this looks like a header row
                const firstCell = row.getCell(1).text?.toLowerCase() || '';
                if (firstCell.includes('msisdn') || firstCell.includes('number') || firstCell.includes('phone') || firstCell.includes('instruction')) {
                  return; // Skip header row
                }
              }
              
              const phoneNumber = row.getCell(1).text || '';
              let dataAllocation = 0;
              let allocRawInput = '';
              
              // Try to get data allocation from column 2 first (various formats)
              if (row.getCell(2).text) {
                allocRawInput = row.getCell(2).text.toString().trim();
                
                // Use enhanced parsing for data allocation
                const allocationResult = parseDataAllocation(allocRawInput);
                
                // Critical bug fix: Check if this looks like a phone number being interpreted as allocation
                if (allocationResult.allocGB >= 10000000 && allocationResult.allocGB <= 999999999 && allocRawInput.startsWith('0') && allocRawInput.length === 10) {
                  // CRITICAL BUG DETECTED - Phone number misinterpreted as allocation - logging removed for security
                  // This suggests columns might be swapped in the Excel file
                } else if (!isNaN(allocationResult.allocGB) && allocationResult.allocGB > 0) {
                  dataAllocation = allocationResult.allocGB;
                  if (allocationResult.wasConverted) {
                    // Excel input converted - logging removed for security
                  }
                } else {
                  // Excel input invalid allocation - logging removed for security
                }
              }
              // Fall back to the old format with MB in column 4 if present
              else if (row.getCell(4) && row.getCell(4).text) {
                allocRawInput = row.getCell(4).text.toString().trim();
                
                // Use enhanced parsing for data allocation
                const allocationResult = parseDataAllocation(allocRawInput);
                
                // Critical bug fix: Check if this looks like a phone number being interpreted as allocation
                if (allocationResult.allocGB >= 10000000 && allocationResult.allocGB <= 999999999 && allocRawInput.startsWith('0') && allocRawInput.length === 10) {
                  // CRITICAL BUG DETECTED - Phone number misinterpreted as allocation - logging removed for security
                  // This suggests columns might be swapped in the Excel file
                } else if (!isNaN(allocationResult.allocGB) && allocationResult.allocGB > 0) {
                  dataAllocation = allocationResult.allocGB;
                  if (allocationResult.wasConverted) {
                    // Excel input converted - logging removed for security
                  }
                } else {
                  // Excel input invalid allocation - logging removed for security
                }
              }
              
              // Add the entry even if phone number or data allocation is invalid to show errors to users
              if (phoneNumber) {
                // Validation will be done by validateNumber function
                // We'll still log the issue here for debugging purposes
                const containsNonDigits = /[^\d]/.test(phoneNumber);
                if (containsNonDigits) {
                  // Excel input: Phone number contains non-numeric characters - logging removed for security
                }
                if (phoneNumber.length !== 10) {
                  // Excel input: Phone number is not 10 digits - logging removed for security
                }
                
                const entryValidation = validateEntry(phoneNumber, dataAllocation);
                if (entryValidation.phoneValidation.wasFixed) {
                  fixedNumbers++;
                }
                
                // Entry validation - logging removed for security
                
                tempEntries.push({
                  phoneNumber: entryValidation.phoneValidation.correctedNumber,
                  dataAllocation,
                  validation: {
                    isValid: entryValidation.isValid,
                    correctedNumber: entryValidation.phoneValidation.correctedNumber,
                    wasFixed: entryValidation.phoneValidation.wasFixed
                  }
                });
              }
            });
          });
          
          // Add a console log to see all temp entries
          // Console log removed for security
          
          // Check how many invalid entries we have
          const invalidCount = tempEntries.filter(entry => !entry.validation.isValid).length;
          // Found invalid entries before deduplication - logging removed for security
          
          // Detect duplicates using the same algorithm as BundleAllocator
          const phoneAllocCombinations = new Set<string>();
          const duplicates = new Set<string>();
          
          // First pass: identify duplicates
          tempEntries.forEach(entry => {
            const uniqueKey = `${entry.phoneNumber}-${entry.dataAllocation}`;
            
            if (phoneAllocCombinations.has(uniqueKey)) {
              duplicates.add(uniqueKey);
            } else {
              phoneAllocCombinations.add(uniqueKey);
            }
          });
          
          // Second pass: create entries with duplicate removal
          const entries: OrderEntry[] = [];
          const seenCombinations = new Set<string>();
          let totalDuplicates = 0;
          
          tempEntries.forEach(entry => {
            const uniqueKey = `${entry.phoneNumber}-${entry.dataAllocation}`;
            
            // Only add if this is the first occurrence of this combination
            if (!seenCombinations.has(uniqueKey)) {
              seenCombinations.add(uniqueKey);
              
              // Double check validity here with regex
              const isValidNumber = /^0\d{9}$/.test(entry.phoneNumber);
              
              // Final validation combines phone format, entry validation, AND data allocation
              const finalValid = isValidNumber && entry.validation.isValid;
              // Final validation - logging removed for security
              
              const newEntry = {
                number: entry.phoneNumber,
                allocationGB: entry.dataAllocation,
                status: "pending" as "pending",
                isValid: finalValid, // Requires BOTH valid phone number AND valid data allocation
                wasFixed: entry.validation.wasFixed,
                isDuplicate: false // No entries are marked as duplicate since we remove them
              };
              
              entries.push(newEntry);
              
              // Log if there's a difference between our validation function and this check
              if (isValidNumber !== entry.validation.isValid) {
                // Validation mismatch - logging removed for security
              }
            } else {
              // Count duplicates that are removed
              totalDuplicates++;
            }
          });
          
          // Prepare alert messages
          const alertMessages: string[] = [];
          
          if (totalDuplicates > 0) {
            alertMessages.push(`Removed ${totalDuplicates} duplicate entry(ies).\n\nDuplicates are identified by matching both phone number AND data allocation.\nOnly the first occurrence of each combination was kept.`);
          }
          
          if (fixedNumbers > 0) {
            alertMessages.push(`Auto-fixed ${fixedNumbers} phone number(s) by adding leading zero.\n\nFixed numbers are marked with a cyan icon.`);
          }
          
          // Store messages to be displayed after file processing (in the handler)
          if (alertMessages.length > 0) {
            // We'll trigger the alert in the handler function instead
            // Console statement removed for security
          }
          
          resolve(entries);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    try {
      setStatus("preparing");
      setManualInputText(""); // Clear manual input when file is uploaded
      const file = e.target.files[0];
      const entries = await readExcelFile(file);
      
      if (entries.length === 0) {
        setErrorMessage("No valid entries found in the file");
        setStatus("error");
        return;
      }
      
      // Get original line count to detect duplicates
      const originalLineCount = await countLinesInExcelFile(file);
      const duplicateCount = originalLineCount - entries.length;
      const fixedCount = entries.filter(entry => entry.wasFixed).length;
      
      // Show alerts for removed duplicates and fixed numbers
      const alertMessages: string[] = [];
      
      if (duplicateCount > 0) {
        alertMessages.push(`Removed ${duplicateCount} duplicate entry(ies).\n\nDuplicates are identified by matching both phone number AND data allocation.\nOnly the first occurrence of each combination was kept.`);
      }
      
      if (fixedCount > 0) {
        alertMessages.push(`Auto-fixed ${fixedCount} phone number(s) by adding leading zero.\n\nFixed numbers are marked with a cyan icon.`);
      }
      
      if (alertMessages.length > 0) {
        window.alert && window.alert(alertMessages.join('\n\n'));
      }
      
      setOrderEntries(entries);
      setStatus("idle");
      e.target.value = '';
    } catch (error) {
      // Console statement removed for security
      setErrorMessage("Failed to process the file. Please make sure it's a valid Excel file.");
      setStatus("error");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    
    try {
      setStatus("preparing");
      setManualInputText(""); // Clear manual input when file is dropped
      const file = e.dataTransfer.files[0];
      const entries = await readExcelFile(file);
      
      if (entries.length === 0) {
        setErrorMessage("No valid entries found in the file");
        setStatus("error");
        return;
      }
      
      // Get original line count to detect duplicates
      const originalLineCount = await countLinesInExcelFile(file);
      const duplicateCount = originalLineCount - entries.length;
      const fixedCount = entries.filter(entry => entry.wasFixed).length;
      
      // Show alerts for removed duplicates and fixed numbers
      const alertMessages: string[] = [];
      
      if (duplicateCount > 0) {
        alertMessages.push(`Removed ${duplicateCount} duplicate entry(ies).\n\nDuplicates are identified by matching both phone number AND data allocation.\nOnly the first occurrence of each combination was kept.`);
      }
      
      if (fixedCount > 0) {
        alertMessages.push(`Auto-fixed ${fixedCount} phone number(s) by adding leading zero.\n\nFixed numbers are marked with a cyan icon.`);
      }
      
      if (alertMessages.length > 0) {
        window.alert && window.alert(alertMessages.join('\n\n'));
      }
      
      setOrderEntries(entries);
      setStatus("idle");
    } catch (error) {
      // Console statement removed for security
      setErrorMessage("Failed to process the file. Please make sure it's a valid Excel file.");
      setStatus("error");
    }
  };

  const handleSendOrder = async () => {
    if (orderEntries.length === 0) return;
    
    // Check if orders are currently halted
    if (ordersHalted) {
      window.alert(`Order processing is currently halted.\n\n${message}`);
      return;
    }
    
    // Check if user has a pricing profile assigned
    if (!pricingData?.hasProfile) {
      window.alert('Cannot send order: No pricing profile assigned to your account.\n\nPlease contact your administrator to assign a pricing profile before placing orders.');
      return;
    }
    
    // Validate that all entries have pricing available in the user's profile
    if (pricingData?.profile?.tiers) {
      const pricingValidation = validateOrderPricing(orderEntries, pricingData.profile.tiers);
      if (!pricingValidation.isValid) {
        const invalidItems = pricingValidation.invalidEntries
          .map(entry => `${entry.number} (${entry.allocationGB}GB)`)
          .join(', ');
        
        window.alert(`Cannot send order: Some entries have no pricing available in your pricing profile.\n\nEntries without pricing: ${invalidItems}\n\nPlease remove these entries or contact your administrator to add pricing for these data allocations.`);
        return;
      }
    }
    
    // Double-check for any invalid entries before proceeding - use both checks
    const invalidEntries = orderEntries.filter(entry => {
      // Check both the flag and the regex pattern
      const isInvalidFlag = entry.isValid === false;
      const isInvalidFormat = !(/^0\d{9}$/.test(entry.number));
      
      // Log any discrepancies for debugging
      if (isInvalidFlag && !isInvalidFormat) {
        // Validation mismatch: flag=invalid but format=valid - logging removed for security
      } else if (!isInvalidFlag && isInvalidFormat) {
        // Validation mismatch: flag=valid but format=invalid - logging removed for security
      }
      
      return isInvalidFlag || isInvalidFormat;
    });
    
    if (invalidEntries.length > 0) {
      // Show detailed message with the invalid numbers
      const invalidNumbers = invalidEntries.map(e => e.number).join(", ");
      window.alert(`Cannot proceed with invalid entries. Please fix these ${invalidEntries.length} invalid entries first:\n\nEach entry must have BOTH:\n• Valid 10-digit phone number (starting with 0)\n• Valid data allocation (greater than 0)\n\nInvalid entries: ${invalidNumbers}`);
      return;
    }
    
    // Check minimum entries requirement
    if (orderEntries.length < minimumOrderEntries) {
      window.alert(`Cannot send order: Minimum ${minimumOrderEntries} entries required.\n\nYou currently have ${orderEntries.length} entries.\nPlease add ${minimumOrderEntries - orderEntries.length} more entries to meet the minimum requirement.`);
      return;
    }
    
    setStatus("sending");
    setProgressPercent(0);
    
    // Process entries in a more efficient way (no artificial delays)
    const totalEntries = orderEntries.length;
    const updatedEntries: OrderEntry[] = orderEntries.map(entry => ({
      ...entry,
      status: "sent",
      message: "Order sent successfully"
    }));
    
    // Update entries at once with 100% progress
    setOrderEntries(updatedEntries);
    setProgressPercent(100);
    
    setStatus("success");
    
    // Add the completed order to the queue in localStorage
    const now = getCurrentTimeSync();
    const timestamp = getCurrentTimestampSync();
    // All entries are now successful since we removed the failure simulation
    const totalData = updatedEntries.reduce((sum, entry) => sum + entry.allocationGB, 0);
    
    // Add all entries to the order
    if (updatedEntries.length > 0) {
      // Create a new order for the queue
      const newOrder = {
        id: `order-${timestamp}`,
        timestamp: timestamp,
        date: getCurrentDateStringSync(),
        time: getCurrentTimeStringSync().substring(0, 5), // HH:MM format
        userName: session?.user?.name || "Anonymous User",
        userEmail: session?.user?.email || "anonymous@example.com",
        totalData: Number(totalData.toFixed(2)),
        totalCount: updatedEntries.length,
        status: "pending" as const, // New orders always start with pending status
        entries: updatedEntries.map((entry: OrderEntry) => {
          const entryCost = pricingData?.hasProfile 
            ? calculatePrice(pricingData.profile, entry.allocationGB) 
            : null;
            
          return {
            number: entry.number,
            allocationGB: entry.allocationGB,
            status: "pending" as const,
            // Include individual cost for each entry
            cost: entryCost
          };
        }),
        // Add pricing information if available
        pricingProfileId: pricingData?.profile?.id,
        pricingProfileName: pricingData?.profile?.name,
        estimatedCost: totalCost,
        isSelected: false
      };
      
      // Add the order to database
      await addOrder(newOrder);
      
      // Notify that orders have been sent using the notification system
      // Console log removed for security
      notifyOrderSent(); // Dispatch ORDER_SENT_EVENT
      notifyCountUpdated(); // Also dispatch COUNT_UPDATED_EVENT for immediate updates
      
      // Refresh the order count to update the notification badge (as a backup mechanism)
      refreshOrderCount();
      
      // Clear localStorage after successful order submission to start fresh next time
      localStorage.removeItem(SEND_ORDER_STORAGE_KEY);
      localStorage.removeItem(SEND_ORDER_TEXT_KEY);
      
      // Clear the manual input text box
      setManualInputText("");
      
      // Reset the interface to initial state after a delay (5 seconds)
      setTimeout(() => {
        // Console log removed for security
        setOrderEntries([]);
        setStatus("idle");
        setErrorMessage("");
        setProgressPercent(0);
      }, 5000); // 5 seconds delay
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const downloadTemplate = () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("SendOrder");
    
    // Add headers - Simplified to just two columns
    worksheet.addRow([
      "Phone Number",
      "Data (GB)",
    ]);
    
    // Format header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add some example data in GB format
    worksheet.addRow(["0200000000", "1"]);
    worksheet.addRow(["0550000000", "2"]);
    worksheet.addRow(["0240000000", "3"]);
    
    // Set column widths
    worksheet.getColumn(1).width = 20; // Phone number column
    worksheet.getColumn(2).width = 15; // GB column
    
    // Generate and download the file
    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'SendOrder_Template.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  // Scroll to the first invalid entry
  const scrollToInvalidEntry = () => {
    // Reset refs array size to match current entries
    invalidEntryRefs.current = invalidEntryRefs.current.slice(0, orderEntries.length);
    
    // Find the first invalid entry's ref
    const firstInvalidRef = invalidEntryRefs.current.find(ref => ref !== null);
    
    if (firstInvalidRef) {
      firstInvalidRef.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
      });
      
      // Add a temporary highlight effect
      firstInvalidRef.classList.add('highlight-pulse');
      setTimeout(() => {
        firstInvalidRef.classList.remove('highlight-pulse');
      }, 2000);
    }
  };
  
  const totalGB = orderEntries.reduce((sum, entry) => sum + entry.allocationGB, 0);
  const successCount = orderEntries.filter(entry => entry.status === "sent").length;
  const errorCount = orderEntries.filter(entry => entry.status === "error").length;
  const pendingCount = orderEntries.filter(entry => entry.status === "pending").length;
  // Find all entries that are explicitly marked as invalid or fail the regex check
  const invalidEntries = orderEntries.filter(entry => {
    // Double check with regex
    const isValidFormat = /^0\d{9}$/.test(entry.number);
    
    // Check both conditions
    const isInvalidByFlag = entry.isValid === false;
    const isInvalidByFormat = !isValidFormat;
    
    // Log any discrepancies for debugging
    if (!isInvalidByFlag && isInvalidByFormat) {
      // Found unmarked invalid entry - logging removed for security
    }
    
    // Be strict - either flag is false or regex fails means invalid
    return isInvalidByFlag || isInvalidByFormat;
  });
  
  const invalidCount = invalidEntries.length;
  const duplicateCount = orderEntries.filter(entry => entry.isDuplicate).length;
  const fixedCount = orderEntries.filter(entry => entry.wasFixed).length;

  // Reset invalid entry refs when entries change
  useEffect(() => {
    invalidEntryRefs.current = invalidEntryRefs.current.slice(0, orderEntries.length);
  }, [orderEntries]);
  
  // Save order entries and manual input text to localStorage whenever they change
  useEffect(() => {
    saveOrderEntriesToStorage(orderEntries, manualInputText);
  }, [orderEntries, manualInputText]);
  
  // Calculate total cost whenever order entries or pricing data changes
  useEffect(() => {
    if (pricingData?.hasProfile && pricingData?.profile && orderEntries.length > 0) {
      // Calculate cost for each individual allocation and sum them up
      const totalCostValue = orderEntries.reduce((sum, entry) => {
        const entryCost = calculatePrice(pricingData.profile, entry.allocationGB);
        return sum + (entryCost || 0);
      }, 0);
      
      // Round to 2 decimal places for display
      const roundedCost = parseFloat(totalCostValue.toFixed(2));
      setTotalCost(roundedCost);
      
      const totalGB = orderEntries.reduce((sum, entry) => sum + entry.allocationGB, 0);
      // Calculated total cost - logging removed for security
    } else {
      setTotalCost(null);
    }
  }, [orderEntries, pricingData]);

  // Debug logging to help identify button disabled reasons
  useEffect(() => {
    if (orderEntries.length > 0) {
      // Console log removed for security
    }
  }, [orderEntries, invalidCount, pricingData, ordersHalted, minimumOrderEntries]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Add the CSS for highlight pulse animation */}
      <style jsx global>{`
        @keyframes highlightPulse {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
        .highlight-pulse {
          animation: highlightPulse 1.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) forwards;
          transform: scale(1.02);
          transition: transform 0.3s ease;
        }
      `}</style>
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Order Halt Banner */}
        <OrderHaltBanner />
        {/* Upload Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-4 sm:mb-8 transition-all hover:shadow-2xl">
          <div className="p-3 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <Send className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <span>Send Orders</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-700 mt-1">
              Upload and process order files for sending
            </p>
          </div>

          <div className="p-3 sm:p-6 space-y-3 sm:space-y-6">
            {/* Input Method Selection Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => !ordersHalted && setInputMethod("file")}
                disabled={ordersHalted}
                className={`flex-1 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  ordersHalted
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : inputMethod === "file"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-700 hover:text-gray-900"
                }`}
                title={ordersHalted ? `Order processing is currently halted: ${message}` : ""}
              >
                <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                Upload File
              </button>
              <button
                onClick={() => !ordersHalted && setInputMethod("manual")}
                disabled={ordersHalted}
                className={`flex-1 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  ordersHalted
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : inputMethod === "manual"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-700 hover:text-gray-900"
                }`}
                title={ordersHalted ? `Order processing is currently halted: ${message}` : ""}
              >
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                Paste Text
              </button>
            </div>

            {/* File Upload Option */}
            {inputMethod === "file" && (
              <div
                onClick={!ordersHalted ? handleUploadClick : undefined}
                onDragOver={!ordersHalted ? handleDragOver : undefined}
                onDrop={!ordersHalted ? handleDrop : undefined}
                className={`border-2 border-dashed rounded-lg sm:rounded-xl p-4 sm:p-8 text-center transition-all duration-300 ${
                  ordersHalted
                    ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                    : "border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
                }`}
                title={ordersHalted ? `Order processing is currently halted: ${message}` : ""}
              >
                <div className={`w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-2 sm:mb-4 flex items-center justify-center rounded-full ${
                  ordersHalted ? "bg-gray-200 text-gray-400" : "bg-gray-100 text-gray-700"
                }`}>
                  <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <p className={`font-medium mb-1 sm:mb-2 text-sm sm:text-base ${
                  ordersHalted ? "text-gray-400" : "text-gray-700"
                }`}>
                  {ordersHalted ? "Order processing is currently halted" : "Drag & drop your order file or click to browse"}
                </p>
              <p className={`text-xs sm:text-sm ${
                ordersHalted ? "text-gray-400" : "text-gray-700"
              }`}>
                {ordersHalted ? message : "Upload Excel file with phone numbers and data (supports GB, G, gig, MB formats)"}
              </p>                {/* Template download link */}
                {!ordersHalted && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadTemplate();
                    }}
                    className="mt-3 text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium flex items-center gap-1 mx-auto"
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                    Download template
                  </button>
                )}
              </div>
            )}

            {/* Manual Input Option */}
            {inputMethod === "manual" && (
              <div className="relative">
                <textarea
                  placeholder={ordersHalted ? `Order processing is currently halted: ${message}` : `Paste phone numbers and data allocation. Supports various formats:

Single-line format (phone and data on same line):
0559147616 25gig
0557192781 3
0248111626 2g
0557884774 8gb

Multi-line format (phone on one line, data on next):
0244987337
2gb

Supports: 25gig, 25gb, 25g, 25, 1024mb, 1024m`}
                  className={`w-full p-3 sm:p-4 border rounded-lg sm:rounded-xl transition-all duration-200 resize-none font-mono text-sm sm:text-base ${
                    ordersHalted
                      ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed placeholder:text-gray-400"
                      : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white shadow-sm hover:shadow-md placeholder:text-gray-700"
                  }`}
                  rows={6}
                  value={manualInputText}
                  disabled={ordersHalted}
                  onChange={(e) => {
                    if (!ordersHalted) {
                      const entries = processManualInput(e.target.value);
                      setOrderEntries(entries);
                      // Save to localStorage after processing
                      saveOrderEntriesToStorage(entries, e.target.value);
                    }
                  }}
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center rounded-lg sm:rounded-xl">
                    <div className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx"
              disabled={ordersHalted}
              className="hidden"
            />
          </div>
        </div>

        {/* Error Message */}
        {status === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 sm:mb-8">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
          </div>
        )}

          {/* Order Details */}
        {orderEntries.length > 0 && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-4 sm:mb-8 transition-all hover:shadow-2xl">
            <div className="p-3 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center flex-wrap gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Order Details</h2>
                <p className="text-xs sm:text-sm text-gray-700 mt-1">
                  {orderEntries.length} entries, {totalGB > 1023 
                    ? `${(totalGB / 1024).toFixed(2)} TB total` 
                    : `${totalGB.toFixed(2)} GB total`}
                  {(invalidCount > 0 || fixedCount > 0) && (
                    <>, {invalidCount} invalid, {fixedCount} auto-fixed</>
                  )}
                </p>
                
                {/* Cost information for users with pricing profiles */}
                {pricingData?.hasProfile && totalCost !== null && (
                  <div className="mt-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <p className="text-base text-green-700 font-bold">
                      Estimated cost: GHS {totalCost.toFixed(2)}
                    </p>
                  </div>
                )}
                
                {/* Minimum entries requirement indicator */}
                {minimumOrderEntries > 1 && (
                  <div className="mt-1 flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full ${
                      orderEntries.length >= minimumOrderEntries ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                    <p className={`text-sm font-medium ${
                      orderEntries.length >= minimumOrderEntries ? 'text-green-700' : 'text-orange-700'
                    }`}>
                      Minimum {minimumOrderEntries} entries required ({orderEntries.length}/{minimumOrderEntries})
                    </p>
                  </div>
                )}
              </div>
              
              {/* Action buttons */}
              {status !== "sending" && status !== "success" && (
                <div className="flex gap-2 mt-3 sm:mt-0">
                  <button
                    onClick={() => {
                      if (!ordersHalted) {
                        setOrderEntries([]);
                        setManualInputText("");
                        setStatus("idle");
                        setErrorMessage("");
                        // Clear localStorage as well
                        localStorage.removeItem(SEND_ORDER_STORAGE_KEY);
                        localStorage.removeItem(SEND_ORDER_TEXT_KEY);
                      }
                    }}
                    disabled={orderEntries.length === 0 || ordersHalted}
                    title={ordersHalted ? `Order processing is currently halted: ${message}` : ""}
                    className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg font-medium flex items-center gap-2 transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleSendOrder}
                    disabled={
                      ordersHalted ||
                      orderEntries.length === 0 || 
                      invalidCount > 0 || 
                      !pricingData?.hasProfile ||
                      orderEntries.length < minimumOrderEntries ||
                      (pricingData?.profile?.tiers && orderEntries.some(entry => 
                        !hasPricingForAllocation(entry.allocationGB, pricingData.profile.tiers || [])
                      ))
                    }
                    title={
                      ordersHalted
                        ? `Order processing is currently halted: ${message}`
                        : !pricingData?.hasProfile 
                        ? "No pricing profile assigned - contact administrator" 
                        : invalidCount > 0 
                        ? `Please fix ${invalidCount} invalid entries before sending` 
                        : orderEntries.length < minimumOrderEntries
                        ? `Minimum ${minimumOrderEntries} entries required (you have ${orderEntries.length})`
                        : pricingData?.profile?.tiers && orderEntries.some(entry => 
                            !hasPricingForAllocation(entry.allocationGB, pricingData.profile.tiers || [])
                          )
                        ? "Some entries have no pricing available in your profile"
                        : orderEntries.length === 0
                        ? "No entries to send"
                        : ""
                    }
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    Send Orders
                  </button>
                </div>
              )}              {/* Progress bar for sending */}
              {status === "sending" && (
                <div className="w-full sm:w-auto flex items-center gap-3">
                  <div className="w-full sm:w-48 bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-700">{Math.round(progressPercent)}%</span>
                </div>
              )}

              {/* Success message */}
              {status === "success" && (
                <div className="flex items-center gap-2 bg-green-100 px-3 py-1.5 rounded-full">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-700 text-sm font-medium">Order processing complete</span>
                </div>
              )}

              {/* Warning message for invalid entries */}
              {invalidCount > 0 && status !== "sending" && status !== "success" && (
                <div className="flex items-center gap-2 bg-red-100 px-3 py-1.5 rounded-full">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-700 text-sm font-medium">
                    Fix {invalidCount} invalid {invalidCount === 1 ? 'entry' : 'entries'} (need valid phone + data allocation)
                  </span>
                </div>
              )}
              
              {/* Warning message for missing pricing profile */}
              {!loadingPricing && !pricingData?.hasProfile && status !== "sending" && status !== "success" && (
                <div className="flex items-center gap-2 bg-orange-100 px-3 py-1.5 rounded-full">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span className="text-orange-700 text-sm font-medium">
                    No pricing profile assigned - contact administrator to enable order submission
                  </span>
                </div>
              )}
              
              {/* Warning message for minimum entries requirement not met */}
              {minimumOrderEntries > 1 && orderEntries.length > 0 && orderEntries.length < minimumOrderEntries && status !== "sending" && status !== "success" && (
                <div className="flex items-center gap-2 bg-orange-100 px-3 py-1.5 rounded-full">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span className="text-orange-700 text-sm font-medium">
                    Need {minimumOrderEntries - orderEntries.length} more {minimumOrderEntries - orderEntries.length === 1 ? 'entry' : 'entries'} to meet minimum requirement of {minimumOrderEntries}
                  </span>
                </div>
              )}
              
              {/* Warning message for entries without pricing */}
              {pricingData?.hasProfile && pricingData?.profile?.tiers && 
               orderEntries.some(entry => !hasPricingForAllocation(entry.allocationGB, pricingData.profile.tiers || [])) && 
               status !== "sending" && status !== "success" && (
                <div className="flex items-center gap-2 bg-orange-100 px-3 py-1.5 rounded-full">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span className="text-orange-700 text-sm font-medium">
                    {orderEntries.filter(entry => !hasPricingForAllocation(entry.allocationGB, pricingData.profile.tiers || [])).length} entries have no pricing available
                  </span>
                </div>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 sm:p-6">
              <div className="bg-green-50 rounded-lg p-2 sm:p-3 text-center">
                <p className="text-xs sm:text-sm text-green-700 font-medium mb-1">
                  {status === "sending" || status === "success" ? "Successful" : "Valid"}
                </p>
                <p className="text-xl font-bold text-green-700">
                  {status === "sending" || status === "success" 
                    ? successCount 
                    : orderEntries.filter(e => e.isValid !== false).length}
                </p>
              </div>
              <div 
                className={`bg-red-50 rounded-lg p-2 sm:p-3 text-center ${
                  invalidCount > 0 && status !== "sending" && status !== "success" 
                  ? "cursor-pointer hover:bg-red-100 transition-colors" 
                  : ""
                }`}
                onClick={() => {
                  if (invalidCount > 0 && status !== "sending" && status !== "success") {
                    scrollToInvalidEntry();
                  }
                }}
                title={invalidCount > 0 ? "Click to scroll to invalid entry" : ""}
              >
                <p className="text-xs sm:text-sm text-red-700 font-medium mb-1">
                  {status === "sending" || status === "success" ? "Failed" : "Invalid"}
                </p>
                <p className="text-xl font-bold text-red-700">
                  {status === "sending" || status === "success" 
                    ? errorCount 
                    : invalidCount}
                </p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2 sm:p-3 text-center">
                <p className="text-xs sm:text-sm text-yellow-700 font-medium mb-1">
                  {status === "sending" || status === "success" ? "Pending" : "Duplicates"}
                </p>
                <p className="text-xl font-bold text-yellow-700">
                  {status === "sending" || status === "success" 
                    ? pendingCount 
                    : duplicateCount}
                </p>
              </div>
              <div className="bg-cyan-50 rounded-lg p-2 sm:p-3 text-center">
                <p className="text-xs sm:text-sm text-cyan-700 font-medium mb-1">Auto-fixed</p>
                <p className="text-xl font-bold text-cyan-700">{fixedCount}</p>
              </div>
              {pricingData?.hasProfile && pricingData?.profile?.tiers && (
                <div className="bg-orange-50 rounded-lg p-2 sm:p-3 text-center">
                  <p className="text-xs sm:text-sm text-orange-700 font-medium mb-1">No Pricing</p>
                  <p className="text-xl font-bold text-orange-700">
                    {orderEntries.filter(entry => 
                      !hasPricingForAllocation(entry.allocationGB, pricingData.profile.tiers || [])
                    ).length}
                  </p>
                </div>
              )}
            </div>
            
            {/* Pricing Summary */}
            {pricingData?.hasProfile && totalCost !== null && (
              <div className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-medium text-emerald-800">Order Cost Summary</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-sm text-emerald-700 font-medium">Pricing Plan</p>
                      <p className="font-bold text-emerald-900">{pricingData.profile.name}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-emerald-700 font-medium">Total Data</p>
                      <p className="font-bold text-emerald-900">
                        {totalGB > 1023 
                          ? `${(totalGB / 1024).toFixed(2)} TB` 
                          : `${totalGB.toFixed(2)} GB`}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-emerald-700 font-medium">Estimated Cost</p>
                      <p className="font-bold text-xl text-emerald-900">GHS {totalCost.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-sm text-emerald-700">
                    <p>* Cost calculated by applying pricing to each individual allocation</p>
                    
                    {pricingData.profile.isTiered && pricingData.profile.tiers && 
                     orderEntries.some(entry => 
                       entry.allocationGB > Math.max(...pricingData.profile.tiers.map((t: any) => parseFloat(t.dataGB)))
                     ) && (
                      <p className="mt-1">
                        Some allocations exceed defined pricing tiers. 
                        For these, price is calculated at 4 GHS per GB.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Order entries list */}
            <div className="max-h-80 sm:max-h-96 overflow-y-auto px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="grid grid-cols-1 gap-2">
                {orderEntries.map((entry, idx) => (
                  <div 
                    key={idx}
                    ref={el => {
                      // First, check if this entry is invalid using strict regex check
                      const isValidFormat = /^0\d{9}$/.test(entry.number);
                      const isInvalidFlag = entry.isValid === false;
                      const isInvalid = !isValidFormat || isInvalidFlag;
                      
                      // Log validation for debugging if there's a mismatch
                      if (isValidFormat && isInvalidFlag) {
                        // Entry has validation mismatch - regex=valid, flag=invalid - logging removed for security
                      } else if (!isValidFormat && !isInvalidFlag) {
                        // Entry has validation mismatch - regex=invalid, flag=valid - logging removed for security
                      }
                      
                      // Only store refs for invalid entries
                      if (isInvalid) {
                        invalidEntryRefs.current[idx] = el;
                      } else {
                        invalidEntryRefs.current[idx] = null;
                      }
                    }}
                    className={`border rounded-lg p-3 flex justify-between items-center ${
                      entry.status === "sent" 
                        ? "bg-green-50 border-green-200" 
                        : entry.status === "error" 
                        ? "bg-red-50 border-red-200" 
                        : !(/^0\d{9}$/.test(entry.number)) || entry.isValid === false
                        ? "bg-red-50 border-red-200"
                        : entry.isDuplicate
                        ? "bg-yellow-50 border-yellow-200"
                        : entry.wasFixed
                        ? "bg-cyan-50 border-cyan-200"
                        : pricingData?.profile?.tiers && !hasPricingForAllocation(entry.allocationGB, pricingData.profile.tiers)
                        ? "bg-orange-50 border-orange-200"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex gap-3 items-center">
                      {entry.status === "sent" && <CheckCircle className="w-5 h-5 text-green-600" />}
                      {entry.status === "error" && <AlertCircle className="w-5 h-5 text-red-600" />}
                      {entry.status === "pending" && (!(/^0\d{9}$/.test(entry.number)) || entry.isValid === false) && <AlertCircle className="w-5 h-5 text-red-600" />}
                      {entry.status === "pending" && entry.isDuplicate && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                      {entry.status === "pending" && entry.wasFixed && <CheckCircle className="w-5 h-5 text-cyan-600" />}
                      {entry.status === "pending" && !entry.wasFixed && !entry.isDuplicate && /^0\d{9}$/.test(entry.number) && entry.isValid !== false && <div className="w-5 h-5" />}
                      
                      <div>
                        <p className={`font-mono text-sm font-medium ${
                          !(/^0\d{9}$/.test(entry.number)) || entry.isValid === false ? "text-red-700" : 
                          entry.isDuplicate ? "text-yellow-700" :
                          entry.wasFixed ? "text-cyan-700" : ""
                        }`}>{entry.number}</p>
                        {entry.message && (
                          <p className={`text-xs sm:text-sm mt-1 ${
                            entry.status === "sent" 
                              ? "text-green-600" 
                              : entry.status === "error" 
                              ? "text-red-600" 
                              : "text-gray-700"
                          }`}>
                            {entry.message}
                          </p>
                        )}
                        {(!(/^0\d{9}$/.test(entry.number)) || entry.isValid === false) && !entry.message && (
                          <p className="text-xs sm:text-sm text-red-600 font-medium mt-1">
                            {entry.number.length !== 10
                              ? `Invalid length (must be 10 digits, got ${entry.number.length})` 
                              : !entry.number.startsWith('0')
                              ? "Must start with 0"
                              : /[^\d]/.test(entry.number)
                              ? "Contains non-numeric characters"
                              : "Invalid number format"}
                          </p>
                        )}
                        {entry.isDuplicate && !entry.message && (
                          <p className="text-xs sm:text-sm text-yellow-600 font-medium mt-1">Duplicate entry</p>
                        )}
                        {entry.wasFixed && !entry.message && (
                          <p className="text-xs sm:text-sm text-cyan-600 font-medium mt-1">Auto-fixed (added leading zero)</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <p className="text-base font-bold text-gray-900">{entry.allocationGB.toFixed(2)} GB</p>
                        {pricingData?.profile?.tiers && (
                          <div className="flex items-center" title={hasPricingForAllocation(entry.allocationGB, pricingData.profile.tiers) ? "Pricing available" : "No pricing available for this allocation"}>
                            {hasPricingForAllocation(entry.allocationGB, pricingData.profile.tiers) ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{(entry.allocationGB * 1024).toFixed(0)} MB</p>
                      {pricingData?.hasProfile && pricingData?.profile && (
                        <div className="mt-1">
                          {hasPricingForAllocation(entry.allocationGB, pricingData.profile.tiers || []) ? (
                            <p className="text-sm text-green-600 font-bold">
                              GHS {calculatePrice(pricingData.profile, entry.allocationGB)?.toFixed(2)}
                            </p>
                          ) : (
                            <p className="text-sm text-red-600 font-bold">
                              No pricing available
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {orderEntries.length === 0 && status !== "error" && (
          <div className="text-center py-8 sm:py-12 px-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl border border-gray-200 shadow-inner">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Send className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">Ready to Send Orders</h3>
            <p className="text-sm sm:text-base text-gray-700 max-w-md mx-auto">
              Upload an order file to begin processing and sending orders
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


