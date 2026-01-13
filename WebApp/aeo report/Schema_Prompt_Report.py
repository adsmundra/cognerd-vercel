import os
from openai import OpenAI
import json

client = OpenAI()

# Read the prompt from the dedicated text file
try:
    with open("seo_schema_prompt.txt", "r", encoding="utf-8") as f:
        PROMPT_TEMPLATE = f.read()
    # Split the prompt into system instructions and the user part
    # The placeholder is the delimiter between the system role and the user data
    parts = PROMPT_TEMPLATE.split("{{ $('SEO_AUDIT').item.json.stdout }}")
    SYSTEM_PROMPT = parts[0]
    # The part after the placeholder contains rules and can be appended
    if len(parts) > 1:
        SYSTEM_PROMPT += parts[1]

except FileNotFoundError:
    SYSTEM_PROMPT = "Error: seo_schema_prompt.txt not found."

def generate_report(page_content_json: str, customer_name: str) -> str:
    """
    Takes script output, generates a schema report using the OpenAI API, 
    and returns the result as an HTML block.
    """
    if "Error" in SYSTEM_PROMPT or not os.environ.get("OPENAI_API_KEY"):
        return "<h2>Schema Report Error</h2><p>Could not generate report. Check API Key and prompt file.</p>"

    try:
        try:
            json_line = next(line for line in page_content_json.splitlines() if line.startswith('{'))
            user_content = f"Here is the homepage content for '{customer_name}' to analyze:\n\n{json.dumps(json.loads(json_line), indent=2)}"
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
        
        html = "<h2>Schema & Structured Data Audit (OpenAI)</h2>"
        
        audit_report = report_data.get("auditReport", {})
        html += "<h3>Audit Report</h3>"
        for key, value in audit_report.items():
            html += f"<h4>{key.replace('_', ' ').title()}</h4>"
            if isinstance(value, list) and value:
                html += "<ul>"
                for item in value:
                    html += f"<li>{item}</li>"
                html += "</ul>"
            else:
                html += "<p>No issues or recommendations.</p>"

        optimized_schema = report_data.get("optimizedSchema", {})
        if optimized_schema:
            html += "<h3>Optimized JSON-LD Schema</h3>"
            html += "<pre><code>"
            html += json.dumps(optimized_schema, indent=2)
            html += "</code></pre>"
            
        return html

    except Exception as e:
        # Return a more detailed error in the HTML for debugging
        import traceback
        tb_str = traceback.format_exc()
        return f"<h2>Schema Report Error (OpenAI)</h2><p>An error occurred: {str(e)}</p><pre>{tb_str}</pre>"