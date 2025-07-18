
'use client';

import React, { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { addPersona } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

const addPersonaSchema = z.object({
  id: z.string().min(3, "ID must be at least 3 characters long.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "ID can only contain lowercase letters, numbers, and hyphens."),
  name: z.string().min(3, "Name must be at least 3 characters long."),
  systemPrompt: z.string().min(10, "System prompt must be at least 10 characters long."),
  voiceId: z.string().min(1, "Please select a voice."),
  ollamaModel: z.string().min(1, "Please select a model."),
});

const availableVoices = [
    { id: "Algenib", name: "Algenib (Local)" },
    { id: "Achernar", name: "Achernar (Local)" },
    { id: "Enif", name: "Enif (Local)" },
    { id: "Fomalhaut", name: "Fomalhaut (Local)" },
    { id: "Deneb", name: "Deneb (Local)" },
    { id: "Canopus", name: "Canopus (Local)" },
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (ElevenLabs)" },
    { id: "2EiwWnXFnvU5JabPnv8n", name: "Clyde (ElevenLabs)" },
    { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi (ElevenLabs)" },
    { id: "D38z5RcWu1voky8WS1ja", name: "Dave (ElevenLabs)" },
    { id: "VR6AewLTigWG4xSOukaG", name: "Fin (ElevenLabs)" },
];

const ollamaModels = ["mistral", "qwen3:8b"];

type AddParticipantDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPersonaAdded: (persona: { id: string; name: string }) => void;
};

export function AddParticipantDialog({
  isOpen,
  onOpenChange,
  onPersonaAdded,
}: AddParticipantDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof addPersonaSchema>>({
    resolver: zodResolver(addPersonaSchema),
    defaultValues: {
      id: '',
      name: '',
      systemPrompt: '',
      voiceId: '',
      ollamaModel: 'mistral',
    },
  });

  const handleAddPersona = async (values: z.infer<typeof addPersonaSchema>) => {
    startTransition(async () => {
      const result = await addPersona(values);
      if (result.status === 'success') {
        onPersonaAdded({id: result.persona.id, name: result.persona.name});
        onOpenChange(false);
        form.reset();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add New Participant</DialogTitle>
          <DialogDescription>
            Create a new historical figure to join the debates.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleAddPersona)}
            className="grid gap-4 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Albert Einstein" {...field} 
                      onChange={(e) => {
                          field.onChange(e);
                          const newId = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                          form.setValue('id', newId);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unique ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., albert-einstein" {...field} />
                  </FormControl>
                   <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt / Persona</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the persona's context, style, and limitations."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
               <FormField
                  control={form.control}
                  name="voiceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voice</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a voice" />
                            </SelectTrigger>
                           </FormControl>
                          <SelectContent>
                            {availableVoices.map(voice => (
                                <SelectItem key={voice.id} value={voice.id}>{voice.name}</SelectItem>
                            ))}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ollamaModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AI Model</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a model" />
                            </Trigger>
                           </FormControl>
                          <SelectContent>
                            {ollamaModels.map(model => (
                                <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>


            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Participant
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
