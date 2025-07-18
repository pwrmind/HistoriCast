'use client';

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, PlusCircle } from 'lucide-react';
import { AddParticipantDialog } from './add-participant-dialog';
import { useToast } from '@/hooks/use-toast';
import originalPersonas from '@/ai/personas.js';

const initialPersonas = Object.entries(originalPersonas).map(([id, persona]: [string, any]) => ({
  id,
  name: persona.name,
}));

export const debateFormSchema = z.object({
  topic: z.string().min(3, {
    message: 'Topic must be at least 3 characters long.',
  }),
  rounds: z.coerce.number().int().min(1).max(5),
  participants: z.array(z.string()).refine((value) => value.length >= 2, {
    message: 'You must select at least two participants.',
  }).refine((value) => value.length <= 5, {
    message: 'You can select at most five participants.',
  }),
});

type DebateFormProps = {
  onFormSubmit: (values: z.infer<typeof debateFormSchema>) => void;
  isPending: boolean;
};

export function DebateForm({ onFormSubmit, isPending }: DebateFormProps) {
  const [personas, setPersonas] = useState(initialPersonas);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof debateFormSchema>>({
    resolver: zodResolver(debateFormSchema),
    defaultValues: {
      topic: "The Future of Humanity",
      rounds: 2,
      participants: ['tesla', 'nietzsche'],
    },
  });

  const handlePersonaAdded = (newPersona: { id: string; name: string }) => {
    setPersonas((prev) => [...prev, newPersona]);
     // Also add the new participant to the selection
    const currentParticipants = form.getValues('participants');
    form.setValue('participants', [...currentParticipants, newPersona.id]);

    toast({
      title: 'Participant Added',
      description: `${newPersona.name} is now available for debates.`,
    });
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl tracking-wide">Create Your Debate</CardTitle>
          <CardDescription>Set the stage for a historical showdown.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Debate Topic</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Science vs. Religion" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="participants"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Select Participants</FormLabel>
                      <FormDescription>
                        Choose 2 to 5 historical figures.
                      </FormDescription>
                    </div>
                    <div className="space-y-3">
                    {personas.map((persona) => (
                      <FormField
                        key={persona.id}
                        control={form.control}
                        name="participants"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={persona.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(persona.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, persona.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== persona.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {persona.name}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                    </div>
                    <FormMessage />
                    <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Participant
                    </Button>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="rounds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Rounds: {field.value}</FormLabel>
                    <FormControl>
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        defaultValue={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isPending} className="w-full" size="lg">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Podcast...
                  </>
                ) : (
                  'Generate Debate'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <AddParticipantDialog 
        isOpen={isDialogOpen}
        onOpenChange={setDialogOpen}
        onPersonaAdded={handlePersonaAdded}
      />
    </>
  );
}
