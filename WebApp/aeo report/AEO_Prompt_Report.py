import os
from openai import OpenAI
import json

client = OpenAI()

# The full prompt template defines the system's role and expected output.
SYSTEM_PROMPT = """
You are an expert AEO (Answer Engine Optimization) auditor assistant. I will provide the extracted content of one or more webpages, including:
- Headings, paragraphs, lists
- Images with alt text or captions
- Structured data (JSON-LD, Microdata, RDFa)
- Optional: metadata like title, meta description

Your task is to produce a comprehensive, human-readable, structured JSON report per page that is easy for a non-technical person to understand.

FOR EACH PAGE, OUTPUT:
{
    "url": "...",
    "structuredContent": [
        {
            "type": "FAQPage HowTo Article Product Service Review Person Organization Breadcrumb",
            "textOrSummary": "...",
            "status": "valid missing incorrect",
            "issues": ["..."],
            "recommendedChanges": "..."
        }
    ],
    "unstructuredContent": [
        {
            "contentType": "paragraph heading list image",
            "textOrAlt": "...",
            "suggestedAeoType": "FAQPage HowTo Article Product Service Review Person Organization Breadcrumb",
            "reasonItIsImportant": "...",
            "recommendation": "markup it with JSON-LD / optimize for AEO/GEO"
        }
    ],
    "optimizationSuggestions": [
        {
            "existingContent": "...",
            "problem": "too generic / missing schema / poor snippet / missing alt text",
            "suggestedFix": "..."
        }
    ],
    "newContentRecommendations": [
        {
            "contentType": "paragraph heading list image",
            "suggestedTopicOrText": "...",
            "aeoType": "FAQPage HowTo Article Product Service Review Person Organization Breadcrumb",
            "reasonForAdding": "..."
        }
    ],
    "summaryScore": {
        "structuredCoverage": "0-100",
        "unstructuredCoverage": "0-100",
        "optimizationOpportunities": "0-100",
        "overallAEOReadiness": "0-100"
    }
}

RULES:
1. Do NOT invent facts. Use placeholders like COMPANY_NAME, SERVICE_NAME if information is missing.
2. Identify all content relevant for AEO, whether structured or unstructured.
3. Clearly separate already structured content, unstructured but AEO-relevant content, content that needs optimization, and suggested new content.
4. Provide concise explanations for each recommendation so a non-technical person can understand.
5. Include JSON-LD validation hints for each structured block (e.g., "validate with Google Rich Results Test").
6. Keep output strictly valid JSON, no extra text, commentary, or formatting outside the JSON.
"""

def generate_report(page_content_json: str, customer_name: str) -> str:
    """
    Takes script output, generates an AEO report using the OpenAI API, 
    and returns the result as an HTML block.
    """
    if not os.environ.get("OPENAI_API_KEY"):
        return "<h2>AEO Report Error</h2><p>OPENAI_API_KEY not found.</p>"

    try:
        try:
            json_line = next(line for line in page_content_json.splitlines() if line.startswith('{'))
            user_content = f"Here is the extracted content for '{customer_name}' to analyze:\n\n{json.dumps(json.loads(json_line), indent=2)}"
        except (json.JSONDecodeError, StopIteration):
            user_content = page_content_json

        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content}
            ],
            response_format={"type": "json_object"}
        )

        json_content = response.choices[0].message.content
        report_data = json.loads(json_content)
        
        html = f"<h2>AEO Audit Report (OpenAI) for {report_data.get('url', '')}</h2>"

        summary = report_data.get("summaryScore", {})
        if summary:
            html += "<h3>Overall AEO Readiness</h3><div style='display: flex; gap: 20px;'>"
            for key, value in summary.items():
                html += f"<div><b>{key.replace('_', ' ').title()}:</b> {value}%</div>"
            html += "</div>"

        sections = {
            "Structured Content": report_data.get("structuredContent", []),
            "Unstructured Content Opportunities": report_data.get("unstructuredContent", []),
            "Optimization Suggestions": report_data.get("optimizationSuggestions", []),
            "New Content Recommendations": report_data.get("newContentRecommendations", [])
        }

        for title, items in sections.items():
            if items:
                html += f"<h3>{title}</h3>"
                for item in items:
                    html += "<div style='border: 1px solid #ccc; padding: 10px; margin-bottom: 10px;'>"
                    for key, value in item.items():
                        html += f"<p><b>{key.title()}:</b> {value}</p>"
                    html += "</div>"

        return html

    except Exception as e:
        import traceback
        tb_str = traceback.format_exc()
        return f"<h2>AEO Report Error (OpenAI)</h2><p>An error occurred: {str(e)}</p><pre>{tb_str}</pre>"

if __name__ == '__main__':
    print("This script is intended to be used as a module.")