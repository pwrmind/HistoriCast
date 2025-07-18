'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, UserCircle, Mic } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import type { GenerateHistoricalDebateOutput } from '@/ai/flows/generate-historical-debate';
import { cn } from '@/lib/utils';

type DebateData = GenerateHistoricalDebateOutput['data'];

type DebateResultProps = {
  data: DebateData;
};

export function DebateResult({ data }: DebateResultProps) {
  const [activeAudioFile, setActiveAudioFile] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  }

  const togglePlay = (audioFile: string) => {
    const wasPlaying = activeAudioFile === audioFile;

    // Pause currently playing audio if any
    if (activeAudioFile && audioRefs.current[activeAudioFile]) {
      audioRefs.current[activeAudioFile].pause();
    }
    
    // If a different clip was clicked, play it
    if (!wasPlaying) {
      const audio = audioRefs.current[audioFile];
      if (audio) {
        audio.currentTime = 0;
        audio.play();
        setActiveAudioFile(audioFile);
      }
    } else {
      // If the same clip was clicked, it's now paused, so clear active state
      setActiveAudioFile(null);
    }
  };

  useEffect(() => {
    // Pre-create audio elements and set up ended listeners
    data.transcript.forEach(turn => {
      if (!audioRefs.current[turn.audioFile]) {
        const audio = new Audio(`/${turn.audioFile}`);
        audio.addEventListener('ended', () => setActiveAudioFile(null));
        audioRefs.current[turn.audioFile] = audio;
      }
    });

    return () => { // Cleanup on component unmount
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.removeEventListener('ended', () => setActiveAudioFile(null));
        audio.src = '';
      });
      audioRefs.current = {};
    };
  }, [data.transcript]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl tracking-wide">Podcast Ready</CardTitle>
        <CardDescription>Listen to the full debate or browse the transcript.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-muted p-4 rounded-lg flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-grow">
            <h3 className="font-semibold text-lg">Full Debate Episode</h3>
            <p className="text-sm text-muted-foreground">Duration: {data.duration}</p>
          </div>
          <audio controls src={`/${data.podcast}`} className="w-full sm:w-auto">
            Your browser does not support the audio element.
          </audio>
          <Button asChild variant="secondary">
            <a href={`/${data.podcast}`} download>
              <Download className="mr-2 h-4 w-4" />
              Download
            </a>
          </Button>
        </div>

        <Separator className="my-6" />

        <div>
          <h3 className="text-xl font-headline font-semibold mb-4">Transcript</h3>
          <div className="space-y-6">
            {data.transcript.map((turn, index) => (
              <div key={index} className="flex gap-4">
                <Avatar>
                  <AvatarImage data-ai-hint="historical person" src={`https://placehold.co/40x40.png`} />
                  <AvatarFallback>{getInitials(turn.speaker)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{turn.speaker}</p>
                    <Button variant="ghost" size="icon" onClick={() => togglePlay(turn.audioFile)} className="h-8 w-8">
                      {activeAudioFile === turn.audioFile ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-muted-foreground mt-1">{turn.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DebateResultSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-3/5" />
        <Skeleton className="h-4 w-4/5" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted p-4 rounded-lg flex items-center gap-4">
          <div className="flex-grow space-y-2">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-10 w-28" />
        </div>
        <Separator />
        <div className="space-y-2">
            <Skeleton className="h-6 w-1/3 mb-4" />
            {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4 items-start">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-1/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
