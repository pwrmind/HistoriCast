'use client';

import React, { useState, useTransition, useRef, useEffect } from 'react';
import { createDebate } from '@/app/actions';
import { DebateForm } from '@/components/debate-form';
import { DebateResult, DebateResultSkeleton } from '@/components/debate-result';
import type { GenerateHistoricalDebateOutput } from '@/ai/flows/generate-historical-debate';
import { useToast } from '@/hooks/use-toast';
import { History, MicVocal } from 'lucide-react';
import type { z } from 'zod';
import type { debateFormSchema } from '@/components/debate-form';

type DebateData = GenerateHistoricalDebateOutput['data'];

export default function Home() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<DebateData | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleFormSubmit = (values: z.infer<typeof debateFormSchema>) => {
    setResult(null); // Clear previous results
    startTransition(async () => {
      const response = await createDebate(values);
      if (response.status === 'success') {
        setResult(response.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error Generating Debate',
          description: response.message,
        });
        setResult(null);
      }
    });
  };

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-6 px-4 md:px-8 border-b border-white/10">
        <div className="container mx-auto flex items-center gap-4">
          <History className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">
            HistoriCast
          </h1>
          <p className="text-muted-foreground mt-1.5 hidden md:block">
            Generate virtual debate podcasts between historical figures.
          </p>
        </div>
      </header>
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 xl:gap-12">
          <div className="lg:col-span-2">
            <div className="sticky top-8">
              <DebateForm onFormSubmit={handleFormSubmit} isPending={isPending} />
            </div>
          </div>
          <div className="lg:col-span-3">
            {isPending && <DebateResultSkeleton />}
            {!isPending && result && (
              <div ref={resultRef}>
                <DebateResult data={result} />
              </div>
            )}
            {!isPending && !result && (
              <div className="flex flex-col items-center justify-center text-center h-full min-h-[400px] bg-card rounded-lg p-8 border-dashed border-2">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <MicVocal className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-2xl font-headline font-semibold">Your Debate Awaits</h2>
                <p className="text-muted-foreground mt-2 max-w-sm">
                  Fill out the form to generate a new podcast episode. The transcript and audio player will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <footer className="text-center p-4 text-muted-foreground text-sm border-t">
        Powered by Genkit, ElevenLabs, and Next.js.
      </footer>
    </div>
  );
}
