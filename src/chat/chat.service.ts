import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor() {
    // Initialize OpenAI in a real implementation
    // this.openai = new OpenAI({
    //   apiKey: process.env.OPENAI_API_KEY,
    // });
  }

  async processChat(messages: Array<{ role: string; content: string }>) {
    try {
      // This is a mock response for development
      // In production, you would call the OpenAI API with Model Context Protocol
      
      // Example of how you would call OpenAI:
      // const completion = await this.openai.chat.completions.create({
      //   model: "gpt-4o",
      //   messages: [
      //     { role: "system", content: "You are Cali, a financial AI advisor specializing in economic analysis and stock insights." },
      //     ...messages.map(msg => ({ 
      //       role: msg.role === 'system' ? 'assistant' : msg.role as any, 
      //       content: msg.content 
      //     }))
      //   ],
      //   temperature: 0.7,
      // });
      // return { response: completion.choices[0].message.content };

      // Mock response for development
      const mockResponses = [
        "backend response for testing"
      ];

      const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      
      // Add a small delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      return { response: randomResponse };
    } catch (error) {
      console.error('Error processing chat:', error);
      throw error;
    }
  }
}
