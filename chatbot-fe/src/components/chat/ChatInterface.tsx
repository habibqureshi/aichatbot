'use client'

import React, { useState, useRef, useEffect, startTransition, useMemo } from 'react'
import { ChatMessage } from '@/app/actions/chat'
import { v4 as uuidv4 } from 'uuid';
import { ENDPOINTS } from '@/app/http/endpoints';

interface ChatInterfaceProps {
  conversationId?: string
}

export default function ChatInterface({  }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [aiConversationId, setAiConversationId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bufferRef = useRef<string>(""); // buffer for streaming text
  const messageIdRef = useRef<string>(""); // buffer for streaming text

  const flushInterval = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const updateMessageState = () => {
    if (bufferRef.current) {
      startTransition(() => {
        setMessages(prev => {
          return prev.map(msg => {
            let temp = msg.id === messageIdRef.current && msg.role === "assistant"
              ? { ...msg, content: bufferRef.current }
              : msg
            return temp
          });
        });
      });
    }
  }

  useEffect(() => {
    return () => {
      if (flushInterval.current) clearInterval(flushInterval.current);
    };
  }, []);

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      let url = ENDPOINTS.BASE_URL + ENDPOINTS.AI.SEND_MESSAGE + "?query=" + encodeURIComponent(userMessage.content);
      if (aiConversationId && aiConversationId.trim() !== "") {
        url += "&id=" + encodeURIComponent(aiConversationId);
      }
      flushInterval.current = setInterval(() => {
        updateMessageState()
      }, 100);
      const eventSource = new EventSource(url);
      let conversationId;
      let messageId = uuidv4();
      messageIdRef.current = messageId
      eventSource.onmessage = (event) => {
        try {
          isLoading ? setIsLoading(false) : null
          const parsed = JSON.parse(event.data);
          if (parsed && typeof parsed === "object" && parsed.id) {
            conversationId = parsed.id
            setAiConversationId(conversationId)
            const assistantMessage: ChatMessage = {
              id: messageId,
              role: 'assistant',
              content: "",
              timestamp: new Date()
            }

            setMessages(prev => [...prev, assistantMessage])
            bufferRef.current = ""
            return;
          }
          else {
            bufferRef.current += parsed['chunk'].replace(/^"(.*)"$/, '$1'); // just append to buffer
          }
        } catch (e) {
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
            timestamp: new Date()
          }
          bufferRef.current = ""
          setMessages(prev => [...prev, errorMessage])
        }

        eventSource.onerror = (err) => {
          eventSource.close();
          if (flushInterval.current) {
            clearInterval(flushInterval.current);
          }
          updateMessageState()
          setIsLoading(false)
        };
        return
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }
      bufferRef.current = ""
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Fix: Message should accept props, not the message object directly.
  type MessageProps = ChatMessage;

  const Message = React.memo((props: MessageProps) => {
    return (
      <div
        className={`flex ${props.role === 'user' ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`flex max-w-[80%] ${props.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 ${props.role === 'user' ? 'ml-3' : 'mr-3'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              props.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {props.role === 'user' ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
            </div>
          </div>

          {/* Message Content */}
          <div className={`rounded-2xl px-4 py-3 ${
            props.role === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}>
            <div className="whitespace-pre-wrap break-words">
              {props.content}
            </div>
          </div>
        </div>
      </div>
    );
  });

  const renderedMessages = useMemo(() => {
    return messages.map((msg) => <Message key={msg.id} {...msg} />);
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [inputValue])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">How can I help you today?</h2>
              <p className="text-gray-500">Start a conversation by typing your message below.</p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="space-y-2">{renderedMessages}</div>

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex max-w-[80%]">
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto p-4">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message AskAI..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '200px' }}
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="absolute right-2 bottom-2 p-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </form>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Ask AI can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
    </div>
  )
}
