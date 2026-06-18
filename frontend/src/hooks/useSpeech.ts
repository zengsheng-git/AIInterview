import { useEffect, useRef, useState } from 'react'

// Web Speech API 语音识别封装
export function useSpeech() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [supported, setSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SR) {
      setSupported(true)
      const recognition = new SR()
      recognition.lang = 'zh-CN'
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event: any) => {
        let text = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript
        }
        setTranscript(text)
      }
      recognition.onerror = (e: any) => setError(e.error)
      recognition.onend = () => setListening(false)
      recognitionRef.current = recognition
    } else {
      setSupported(false)
    }
  }, [])

  const start = () => {
    if (!recognitionRef.current) return
    setError(null)
    setTranscript('')
    recognitionRef.current.start()
    setListening(true)
  }

  const stop = () => {
    if (!recognitionRef.current) return
    recognitionRef.current.stop()
    setListening(false)
  }

  const reset = () => setTranscript('')

  return { listening, transcript, supported, error, start, stop, reset }
}
