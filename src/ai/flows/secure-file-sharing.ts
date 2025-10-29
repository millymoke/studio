
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
  recipient: z
    .string()
    .email()
    .optional()
    .describe('The intended recipient of the file (optional).'),
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

const prompt = ai.definePrompt({
  name: 'generateOneTimeLinkPrompt',
  input: {schema: GenerateOneTimeLinkInputSchema},
  output: {schema: GenerateOneTimeLinkOutputSchema},
  prompt: `You are a security expert. Your task is to generate a secure, one-time, self-destructing link for the provided file.

File data URI is provided in the input.

The link should be unique and encrypted. Once the link is accessed once, it should become invalid and self-destruct.

{{#if recipient}}
The link should be associated with the recipient: {{{recipient}}}
{{/if}}

Generate a unique URL for this. For the purpose of this simulation, you can use a placeholder URL structure like "https://example.com/secure/..." with a unique token.
`,
});

const generateOneTimeLinkFlow = ai.defineFlow(
  {
    name: 'generateOneTimeLinkFlow',
    inputSchema: GenerateOneTimeLinkInputSchema,
    outputSchema: GenerateOneTimeLinkOutputSchema,
  },
  async (input) => {
    // In a real application, you would:
    // 1. Encrypt the file content.
    // 2. Store the encrypted file in a secure storage (e.g., a database or a secure cloud storage).
    // 3. Generate a unique token and store it with the file details and recipient. The token's status would be marked as 'used' after one access.
    // 4. Construct the one-time link with the unique token.

    // For this prototype, we'll simulate the link generation using an AI prompt.
    const {output} = await prompt(input);
    
    // Simulate a more realistic-looking secure link
    if (output && output.oneTimeLink) {
        const uniqueToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        output.oneTimeLink = `https://www.sharespace.media/s/${uniqueToken}`;
    }
    
    return output!;
  }
);
