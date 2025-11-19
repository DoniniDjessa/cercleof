import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, image, mode } = body

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      )
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    let result
    if (image && mode === 'multimodal') {
      // Multimodal: image + text
      const imagePart = {
        inlineData: {
          data: image,
          mimeType: 'image/jpeg'
        }
      }
      result = await model.generateContent([prompt, imagePart])
    } else {
      // Text only
      result = await model.generateContent(prompt)
    }

    const response = await result.response
    const text = response.text()

    return NextResponse.json({ text })
  } catch (error: any) {
    console.error('Gemini API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}

