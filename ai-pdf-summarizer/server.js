import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import PDFParser from 'pdf2json';
import cors from 'cors'; 



dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// In-memory file storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Parses PDF buffer to raw text and page count using pure ES module
 */
function extractTextFromPDF(buffer) {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(null, 1);

    parser.on('pdfParser_dataError', (errData) => {
      reject(errData.parserError);
    });

    parser.on('pdfParser_dataReady', () => {
      const rawText = parser.getRawTextContent();
      const pageCount = parser.data.Pages ? parser.data.Pages.length : 1;
      resolve({ text: rawText, numpages: pageCount });
    });

    parser.parseBuffer(buffer);
  });
}

/**
 * Splits text into chunks respecting character limits
 */
function chunkText(text, chunkSize = 12000, overlap = 1000) {
  const chunks = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    chunks.push(text.slice(startIndex, endIndex));
    startIndex += chunkSize - overlap;
  }
  return chunks;
}

/**
 * Summarization Engine
 */
async function summarizeDocument(fullText) {
  // Direct summary for short-to-medium documents
  if (fullText.length <= 15000) {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `You are an executive research assistant. Summarize the following document.
Structure your output:
- **Core Summary**: 2-3 clear paragraphs.
- **Key Takeaways**: Bullet points.
- **Important Data / Definitions**: If applicable.

Content:
${fullText}`
    });
    return response.text;
  }

  // Map-Reduce for large documents / books
  const chunks = chunkText(fullText);

  const mapPromises = chunks.map((chunk, index) =>
    ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Summarize the essential points from Section ${index + 1}:
${chunk}`
    }).then((res) => res.text)
  );

  const chunkSummaries = await Promise.all(mapPromises);

  const combinedContext = chunkSummaries.join('\n\n---\n\n');
  const finalResponse = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: `You are tasked with synthesizing section summaries of a document into a final master report.

Combine these section summaries into a single structured, cohesive summary:
${combinedContext}`
  });

  return finalResponse.text;
}

// POST endpoint
app.post('/api/summarize-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    const parsedData = await extractTextFromPDF(req.file.buffer);
    const cleanedText = parsedData.text.replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim();

    if (!cleanedText) {
      return res.status(422).json({
        error: 'Failed to extract text. The document may consist of scanned images.'
      });
    }

    const summary = await summarizeDocument(cleanedText);

    res.json({
      totalPages: parsedData.numpages,
      charactersExtracted: cleanedText.length,
      summary: summary
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: 'Internal server error during summarization.' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});