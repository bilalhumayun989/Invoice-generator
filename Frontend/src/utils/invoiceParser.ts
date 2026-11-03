import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Tesseract from 'tesseract.js';
import type { InvoiceData } from '../types/invoice';

// Initialize PDF.js worker using local import for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const parseJSON = async (file: File): Promise<Partial<InvoiceData>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (typeof event.target?.result === 'string') {
          const parsed = JSON.parse(event.target.result);
          // In a real application, you'd want to validate the structure here.
          // For now, we assume the JSON structure matches our Partial<InvoiceData>
          resolve(parsed as Partial<InvoiceData>);
        } else {
          reject(new Error("Failed to read file as string"));
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

const extractLinesFromPDFItems = (items: any[]): string => {
  const lines: string[] = [];
  let currentLine = '';
  let lastY: number | null = null;

  for (const item of items) {
    if (typeof item.str !== 'string') continue;
    
    // item.transform[5] is the Y-coordinate in PDF space
    const y = item.transform ? item.transform[5] : null;

    if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
      if (currentLine.trim()) lines.push(currentLine.trim());
      currentLine = item.str;
    } else {
      currentLine += (currentLine ? ' ' : '') + item.str;
    }
    
    if (y !== null) lastY = y;
    if (item.hasEOL) {
      if (currentLine.trim()) lines.push(currentLine.trim());
      currentLine = '';
      lastY = null;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines.join('\n');
};

const extractDataFromText = (text: string): Partial<InvoiceData> => {
  console.log('[InvoiceParser] Raw Extracted Text:\n', text);
  const data: Partial<InvoiceData> = {};

  // 1. Invoice Number — match full alphanumeric+dash format e.g. 2026-476, INV-2026-001
  const invMatch = text.match(/(?:Invoice\s*(?:#|Number|No\.?)|INV[-]?)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-_]{2,30})/i);
  if (invMatch) data.invoiceNumber = invMatch[1].trim();

  // 2. Dates
  const dateMatch = text.match(/(?:Issued|Issue\s*Date|Date)\s*[:\-]?\s*([\d]{1,4}[-/.\s][A-Za-z\d]{1,4}[-/.\s][\d]{1,4})/i);
  if (dateMatch) {
    try {
      const parsedDate = new Date(dateMatch[1]);
      if (!isNaN(parsedDate.getTime())) {
        data.issueDate = parsedDate.toISOString().split('T')[0];
      }
    } catch (e) {}
  }
  
  const dueDateMatch = text.match(/(?:Due\s*Date|Payment\s*Due)\s*[:\-]?\s*([\d]{1,4}[-/.\s][A-Za-z\d]{1,4}[-/.\s][\d]{1,4})/i);
  if (dueDateMatch) {
    try {
      const parsedDate = new Date(dueDateMatch[1]);
      if (!isNaN(parsedDate.getTime())) {
        data.dueDate = parsedDate.toISOString().split('T')[0];
      }
    } catch (e) {}
  }

  // 3. Client Name + Address + Phone (Bill To section)
  // Clear defaults so we don't keep stale values
  data.clientAddress = '';
  data.clientPhone = '';

  const billToIdx = text.search(/Bill(?:ed)?\s*To/i);
  if (billToIdx !== -1) {
    const afterBillTo = text.substring(billToIdx).split('\n');
    let clientNameFound = false;
    // Collect up to 8 lines after "Bill To" to extract name, address, phone
    const addressLines: string[] = [];
    for (let i = 1; i < Math.min(afterBillTo.length, 10); i++) {
      const line = afterBillTo[i].replace(/^(?:[:\-]\s*)?/, '').trim();
      if (!line) continue;
      // Stop if we hit a new section keyword
      if (/^(from|invoice|payment|project|billing|bank|notes|thank)/i.test(line)) break;

      if (!clientNameFound) {
        if (!line.includes('@') && !line.toLowerCase().startsWith('date')) {
          data.clientName = line;
          clientNameFound = true;
        }
        continue;
      }

      // After name: collect address lines (skip emails)
      let isContactLine = false;
      const emailMatch = line.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
      if (emailMatch) {
        data.clientEmail = emailMatch[1];
        isContactLine = true;
        
        // Extract phone from the rest of the line (e.g. after a pipe)
        const restOfLine = line.replace(emailMatch[0], '').replace(/[\|:,-]/g, '').trim();
        const phoneMatch = restOfLine.match(/^(\+?[\d][\d\s\-\(\)]{8,}\d)$/);
        if (phoneMatch) {
          data.clientPhone = phoneMatch[1].trim();
        }
      } else {
        // Phone line: digits only, no letters, min 10 chars (avoid invoice numbers)
        const phoneMatch = line.match(/^(\+?[\d][\d\s\-\(\)]{8,}\d)$/);
        if (phoneMatch) {
          data.clientPhone = line.trim();
          isContactLine = true;
        }
      }

      if (isContactLine) continue;
      // Everything else before email/phone is address
      if (addressLines.length < 3 && !/^(paid|pending|usd|pkr)/i.test(line)) {
        addressLines.push(line);
      }
    }
    if (addressLines.length > 0) {
      data.clientAddress = addressLines.join('\n');
    }
  }

  // 4. Company Name + Phone (From section)
  data.companyPhone = '';
  const fromIdx = text.search(/(?:From|Billed\s*By)/i);
  if (fromIdx !== -1) {
    const afterFrom = text.substring(fromIdx).split('\n');
    let companyNameFound = false;
    for (let i = 1; i < Math.min(afterFrom.length, 8); i++) {
      const line = afterFrom[i].replace(/^(?:[:\-]\s*)?/, '').trim();
      if (!line) continue;
      if (/^(bill|invoice|payment|project|billing|bank)/i.test(line)) break;

      if (!companyNameFound) {
        if (!line.includes('@')) {
          data.companyName = line;
          companyNameFound = true;
        }
        continue;
      }
      let isContactLine = false;
      const emailMatch = line.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
      if (emailMatch) {
        data.companyEmail = emailMatch[1];
        isContactLine = true;
        
        const restOfLine = line.replace(emailMatch[0], '').replace(/[\|:,-]/g, '').trim();
        const compPhoneMatch = restOfLine.match(/^(\+?[\d][\d\s\-\(\)]{8,}\d)$/);
        if (compPhoneMatch) {
          data.companyPhone = compPhoneMatch[1].trim();
        }
      } else {
        // Company phone: must be digits only, min 10 chars
        const compPhoneMatch = line.match(/^(\+?[\d][\d\s\-\(\)]{8,}\d)$/);
        if (compPhoneMatch) {
          data.companyPhone = line.trim();
          isContactLine = true;
        }
      }

      if (isContactLine) continue;
    }
  }

  // 5. Remaining emails not yet captured
  const emails = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g);
  if (emails) {
    if (!data.companyEmail && emails.length > 0) data.companyEmail = emails[0];
    if (!data.clientEmail && emails.length > 1) data.clientEmail = emails[emails.length - 1];
  }

  // 6. Bank Details (Reset them so if they don't exist on PDF, they are cleared)
  data.bankName = '';
  data.accountTitle = '';
  data.accountNumber = '';

  // First try to parse tabular "BANKING DETAILS" block where labels and values are on separate lines
  const bankSectionIdx = text.search(/BANKING\s*DETAILS|Bank\s*Details/i);
  if (bankSectionIdx !== -1) {
    const bLines = text.substring(bankSectionIdx).split('\n').slice(0, 10);
    for (let i = 0; i < bLines.length; i++) {
      const line = bLines[i].trim();
      
      // Match "BANK    TITLE"
      if (/\bbank\b/i.test(line) && /\btitle\b/i.test(line)) {
        const nextLine = (bLines[i + 1] || '').trim();
        const vals = nextLine.split(/\s{2,}/);
        if (vals.length >= 2) {
          data.bankName = vals[0].trim();
          data.accountTitle = vals[1].trim();
        }
      }
      
      // Match "ACCOUNT / IBAN"
      if (/(?:ACCOUNT\s*\/?\s*IBAN|\bIBAN\b|ACCOUNT\s*NUMBER)/i.test(line) && !line.match(/[:\-]\s*[A-Z0-9]/)) {
        const nextLine = (bLines[i + 1] || '').trim();
        const accMatch = nextLine.match(/^([A-Z0-9][A-Z0-9\s\-]{7,33})(?=\s{2,}|\n|$)/i);
        if (accMatch) {
          data.accountNumber = accMatch[1].trim();
        }
      }
    }
  }

  // Fallback to inline regex matching if tabular extraction didn't find them
  if (!data.bankName) {
    const bankMatch = text.match(/(?:\bBank\s*Name|\bBank\b)\s*[:\-]?\s*([A-Za-z0-9\s&.,\-]+?)(?=\s{2,}|\n|$)/i);
    if (bankMatch && !bankMatch[1].toLowerCase().includes('account')) {
      data.bankName = bankMatch[1].trim();
    }
  }

  if (!data.accountTitle) {
    const titleMatch = text.match(/(?:Account\s*Title|Account\s*Name|\bTitle\b)\s*[:\-]?\s*([A-Za-z0-9\s&.,\-]+?)(?=\s{2,}|\n|$)/i);
    if (titleMatch) data.accountTitle = titleMatch[1].trim();
  }

  if (!data.accountNumber) {
    const accMatch = text.match(/(?:Account\s*\/?\s*IBAN|Account\s*Number|Account\s*No\.?|\bIBAN\b|\bAccount\b)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\s\-]{7,33}?)(?=\s{2,}|\n|$)/i);
    if (accMatch) data.accountNumber = accMatch[1].trim();
  }

  // 7. Line Items (Project Scope)
  const lines = text.split('\n');
  const items: any[] = [];
  
  const scopeIdx = lines.findIndex(l => l.toLowerCase().includes('project scope'));
  if (scopeIdx !== -1) {
    let currentItem: any = null;
    for (let i = scopeIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      if (line.toLowerCase().match(/^(subtotal|grand total|total|amount due|balance|thank you|notes)/)) {
        break;
      }
      
      const qtyMatch = line.match(/Qty:\s*(\d+)/i);
      const rateMatch = line.match(/Rate:\s*(USD|PKR|\$|Rs\.?)\s*([\d,]+\.?\d*)/i);
      
      if (qtyMatch) {
         if (currentItem) items.push(currentItem);
         let desc = 'Item';
         if (i > 0 && !lines[i-1].match(/Qty:|Rate:|USD|PKR/i)) {
            desc = lines[i-1].trim();
         }
         currentItem = {
            id: Math.random().toString(36).substr(2, 9),
            description: desc,
            quantity: parseInt(qtyMatch[1], 10),
            currency: 'USD',
            unitPrice: 0
         };
      } else if (rateMatch && currentItem) {
         currentItem.currency = (rateMatch[1].toUpperCase().includes('PKR') || rateMatch[1].toUpperCase().includes('RS')) ? 'PKR' : 'USD';
         currentItem.unitPrice = parseFloat(rateMatch[2].replace(/,/g, ''));
      }
    }
    if (currentItem) items.push(currentItem);
  }

  // Fallback for line items if Project Scope was not found or items empty
  if (items.length === 0) {
    for (const line of lines) {
      // Strict fallback regex requiring a currency indicator to avoid matching phone numbers/dates
      // Format: Description [Qty] [Currency] [UnitPrice] [Optional Currency] [Optional Total]
      const itemMatch = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s+(USD|PKR|\$|Rs\.?)\s*([\d,]+\.?\d*)(?:\s+(?:USD|PKR|\$|Rs\.?)?\s*[\d,]+\.?\d*)?$/i);
      
      if (itemMatch && !line.toLowerCase().includes('total') && !line.toLowerCase().includes('subtotal') && !line.toLowerCase().includes('balance')) {
        items.push({
          id: Math.random().toString(36).substr(2, 9),
          description: itemMatch[1].trim(),
          quantity: parseFloat(itemMatch[2]) || 1,
          currency: itemMatch[3].toUpperCase().includes('PKR') || itemMatch[3].toUpperCase().includes('RS') ? 'PKR' : 'USD',
          unitPrice: parseFloat(itemMatch[4].replace(/,/g, '')) || 0
        });
      }
    }
  }

  // Set items explicitly (clears default items if empty)
  data.items = items.length > 0 ? items : [];

  // 8. Monthly Retainer
  // Reset to zero so the form doesn't show stale retainer from a previous invoice
  data.monthlyAmount = '0';
  data.billingType = 'one-time';

  // Look for "Monthly Retainer" section with an amount on the same or next line
  const retainerIdx = lines.findIndex(l => /monthly\s*retainer/i.test(l));
  if (retainerIdx !== -1) {
    data.billingType = 'monthly-retainer';
    // Scan next few lines for amount
    for (let i = retainerIdx; i < Math.min(retainerIdx + 5, lines.length); i++) {
      const amtMatch = lines[i].match(/(PKR|USD|\$|Rs\.?)\s*([\d,]+\.?\d*)/i);
      if (amtMatch) {
        data.monthlyCurrency = amtMatch[1].toUpperCase().includes('USD') || amtMatch[1] === '$' ? 'USD' : 'PKR';
        data.monthlyAmount = amtMatch[2].replace(/,/g, '');
        break;
      }
      // Also try plain number after the word Retainer
      const plainAmt = lines[i].match(/retainer\s*[:\-]?\s*([\d,]+\.?\d*)/i);
      if (plainAmt) {
        data.monthlyAmount = plainAmt[1].replace(/,/g, '');
        break;
      }
    }
    // Try to find the billing month (e.g., "January 2026", "Aug 2025")
    const monthMatch = text.match(/(?:monthly\s*retainer\s*(?:fee)?[^\n]*\n[^\n]*|billing\s*month\s*[:\-]?\s*)([A-Za-z]+ \d{4})/i);
    if (monthMatch) data.billingMonth = monthMatch[1];

    // Try to find the monthly description
    const descLine = lines[retainerIdx + 1]?.trim();
    if (descLine && !/^\d|PKR|USD/i.test(descLine)) {
      data.monthlyDescription = descLine;
    }
  }

  // 9. Discount
  data.discountAmount = '0';
  data.discountPercent = '0';

  // Match "Discount: PKR 5,000" or "Discount 5%" or "Discount: 5,000"
  const discountLine = lines.find(l => /discount/i.test(l));
  if (discountLine) {
    const discPctMatch = discountLine.match(/discount\s*[:\-]?\s*([\d.]+)\s*%/i);
    const discAmtMatch = discountLine.match(/discount\s*[:\-]?\s*(PKR|USD|\$|Rs\.?)?\s*([\d,]+\.?\d*)/i);
    if (discPctMatch) {
      data.discountPercent = discPctMatch[1];
    } else if (discAmtMatch && discAmtMatch[2]) {
      data.discountCurrency = discAmtMatch[1]?.toUpperCase().includes('USD') || discAmtMatch[1] === '$' ? 'USD' : 'PKR';
      data.discountAmount = discAmtMatch[2].replace(/,/g, '');
    }
  }

  // 10. Payment Schedule (Advance Payments only — all entries treated as advance, NOT milestones)
  data.advanceAmount = '0';
  data.isMilestonePayment = false;
  data.milestones = [];

  const scheduleIdx = lines.findIndex(l => /payment\s*schedule/i.test(l));
  if (scheduleIdx !== -1) {
    let totalAdvance = 0;
    let advCurrency: 'USD' | 'PKR' = 'PKR';
    let advStatus: 'Paid' | 'Pending' = 'Pending';
    let advDate = '';

    for (let i = scheduleIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (/(?:gross\s*subtotal|net\s*total|outstanding\s*balance|total\s*paid|thank\s*you|footer)/i.test(line)) break;

      const prevLine2 = (lines[i - 2] || '').trim();
      const prevLine = (lines[i - 1] || '').trim();
      const nextLine1 = (lines[i + 1] || '').trim();
      const nextLine2 = (lines[i + 2] || '').trim();
      const context = `${prevLine2} ${prevLine} ${line} ${nextLine1} ${nextLine2}`;

      const amtMatch = line.match(/(PKR|USD|\$|Rs\.?)\s*([\d,]+\.?\d*)/i);
      if (!amtMatch) continue;

      if (/\bpaid\b/i.test(context)) {
        advStatus = 'Paid';
      } else if (/\bpending\b|\bunpaid\b/i.test(context)) {
        advStatus = 'Pending';
      }

      const currency = amtMatch[1].toUpperCase().includes('USD') || amtMatch[1] === '$' ? 'USD' : 'PKR';
      const amount = parseFloat(amtMatch[2].replace(/,/g, '')) || 0;

      if (totalAdvance === 0) {
        advCurrency = currency;
      }
      totalAdvance += amount;

      const dateM = context.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
      if (dateM && !advDate) {
        let d = dateM[1];
        if (d.includes('/')) {
          const parts = d.split('/');
          if (parts.length === 3 && parts[2].length === 4) {
            const p1 = parts[0].padStart(2, '0');
            const p2 = parts[1].padStart(2, '0');
            d = `${parts[2]}-${p1}-${p2}`;
          }
        } else if (d.includes('-') && d.split('-')[0].length !== 4) {
          const parts = d.split('-');
          if (parts.length === 3 && parts[2].length === 4) {
            const p1 = parts[0].padStart(2, '0');
            const p2 = parts[1].padStart(2, '0');
            d = `${parts[2]}-${p1}-${p2}`;
          }
        }
        advDate = d;
      }
    }

    if (totalAdvance > 0) {
      data.advanceCurrency = advCurrency;
      data.advanceAmount = totalAdvance.toString();
      data.advanceStatus = advStatus;
      if (advDate) {
        data.advanceDate = advDate;
      }
    }
  }

  // 11. Notes / Grand Total
  const totalMatch = text.match(/(?:Grand Total|Total|Amount Due|Balance Due|Net Total)\s*[:\-]?\s*(?:USD|PKR|\$|Rs\.?)?\s*([\d,]+\.?\d*)/i);
  if (totalMatch) {
     data.notes = `Extracted Total: ${totalMatch[1]}`;
  }

  console.log('[InvoiceParser] Extracted Data Object:\n', data);
  return data;
};

export const parsePDF = async (file: File): Promise<Partial<InvoiceData>> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = extractLinesFromPDFItems(textContent.items);
    fullText += pageText + '\n';
  }

  return extractDataFromText(fullText);
};

export const parseImage = async (file: File): Promise<Partial<InvoiceData>> => {
  const result = await Tesseract.recognize(file, 'eng');
  return extractDataFromText(result.data.text);
};
