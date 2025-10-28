# Instruction-Based Prompting
# 


# https://cookbook.openai.com/examples/summarizing_long_documents
openai_summarizer="""
<instruction>
Summarizes a given text by splitting it into chunks, each of which is summarized individually. 
The level of detail in the summary can be adjusted, and the process can optionally be made recursive.

<Parameters>
- text (str): The text to be summarized.
- detail (float, optional): A value between 0 and 1 indicating the desired level of detail in the summary.
    0 leads to a higher level summary, and 1 results in a more detailed summary. Defaults to 0.
- model (str, optional): The model to use for generating summaries. Defaults to 'gpt-3.5-turbo'.
- additional_instructions (Optional[str], optional): Additional instructions to provide to the model for customizing summaries.
- minimum_chunk_size (Optional[int], optional): The minimum size for text chunks. Defaults to 500.
- chunk_delimiter (str, optional): The delimiter used to split the text into chunks. Defaults to ".".
- summarize_recursively (bool, optional): If True, summaries are generated recursively, using previous summaries for context.
- verbose (bool, optional): If True, prints detailed information about the chunking process.

<Returns>
- str: The final compiled summary of the text.

<explanation>
The function first determines the number of chunks by interpolating between a minimum and a maximum chunk count based on the `detail` parameter. 
It then splits the text into chunks and summarizes each chunk. If `summarize_recursively` is True, each summary is based on the previous summaries, 
adding more context to the summarization process. The function returns a compiled summary of all chunks.
"""

# https://docs.claude.com/en/docs/about-claude/use-case-guides/legal-summarization#transform-documents-into-a-format-that-claude-can-process
claude_summarization = """Summarize the following sublease agreement. Focus on these key aspects:

{details_to_extract_str}

Provide the summary in bullet points nested within the XML header for each section. For example:

<parties involved>
- Sublessor: [Name]
// Add more details as needed
</parties involved>

If any information is not explicitly stated in the document, note it as "Not specified". Do not preamble.

Sublease agreement text:
{text}
"""
