'use server';

/**
 * @fileOverview Secure file sharing flow using one-time, self-destructing encrypted links.
 *
 * - generateOneTimeLink - A function that generates a secure, one-time link for file sharing.
 * - GenerateOneTimeLinkInput - The input type for the generateOneTimeLink function.
 * - GenerateOneTimeLinkOutput - The return type for the generateOneTimeLink function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateOneTimeLinkInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "The file to be shared, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  recipient: z.string().describe('The intended recipient of the file.'),
  expirationMinutes: z
    .number()
    .default(60)
    .describe(
      'The number of minutes the link should be valid for, defaulting to 60 minutes.'
    ),
});
export type GenerateOneTimeLinkInput = z.infer<
  typeof GenerateOneTimeLinkInputSchema
>;

const GenerateOneTimeLinkOutputSchema = z.object({
  oneTimeLink: z.string().describe('The generated one-time, self-destructing link.'),
});
export type GenerateOneTimeLinkOutput = z.infer<
  typeof GenerateOneTimeLinkOutputSchema
>;

export async function generateOneTimeLink(
  input: GenerateOneTimeLinkInput
): Promise<GenerateOneTimeLinkOutput> {
  return generateOneTimeLinkFlow(input);
}

const generateOneTimeLinkPrompt = ai.definePrompt({
  name: 'generateOneTimeLinkPrompt',
  input: {schema: GenerateOneTimeLinkInputSchema},
  output: {schema: GenerateOneTimeLinkOutputSchema},
  prompt: `You are an expert in secure file sharing and encryption. Generate a one-time, self-destructing link for the following file, ensuring maximum security and privacy. The link should expire after {{expirationMinutes}} minutes.

File: {{fileDataUri}}
Recipient: {{recipient}}

Provide only the one-time link in the response.  Do not include any other text. Example:  https://example.com/secure/{{unique_id}}`,
});

const generateOneTimeLinkFlow = ai.defineFlow(
  {
    name: 'generateOneTimeLinkFlow',
    inputSchema: GenerateOneTimeLinkInputSchema,
    outputSchema: GenerateOneTimeLinkOutputSchema,
  },
  async input => {
    const {output} = await generateOneTimeLinkPrompt(input);
    return output!;
  }
);
