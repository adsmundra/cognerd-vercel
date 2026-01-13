
import json

def generate_report(page_content_json: str, customer_name: str) -> str:
    """
    Takes the raw JSON output of the seo_audit_extd.py script and formats
    it into a human-readable HTML table.

    Args:
        page_content_json: A JSON string with the extracted content of a webpage.
        customer_name: The name of the customer (for context, though not used in this function).

    Returns:
        A string containing an HTML block with the formatted data.
    """
    html = "<h2>Basic Crawl Data Report</h2>"
    try:
        # Find the JSON line in the script output
        json_line = next(line for line in page_content_json.splitlines() if line.startswith('{'))
        data = json.loads(json_line)
        
        # The JSON is a list with one dictionary, extract the dictionary
        if isinstance(data, list) and data:
            data = data[0]

        html += "<p>This report shows the raw data extracted from the first crawled page.</p>"
        html += "<table border='1' cellpadding='5' cellspacing='0' style='border-collapse: collapse; width: 100%;'>"
        html += "<tr><th style='text-align: left;'>Key</th><th style='text-align: left;'>Value</th></tr>"
        
        for key, value in data.items():
            # Pretty print lists or dicts within the value
            if isinstance(value, (list, dict)):
                display_value = f"<pre>{json.dumps(value, indent=2)}</pre>"
            else:
                display_value = str(value)
            
            html += f"<tr><td style='vertical-align: top;'><pre>{key}</pre></td><td>{display_value}</td></tr>"
            
        html += "</table>"
        return html

    except Exception as e:
        import traceback
        tb_str = traceback.format_exc()
        html += f"<p>Could not parse or format the basic crawl data. Reason: {e}</p><pre>{tb_str}</pre>"
        # Also show the raw data for debugging
        html += "<h3>Raw Output</h3>"
        html += f"<pre>{page_content_json}</pre>"
        return html
