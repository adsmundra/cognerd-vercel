import os
import subprocess
import json
from flask import Flask, request, render_template_string
from datetime import datetime
import concurrent.futures
import psycopg2
from dotenv import load_dotenv
import logging

# --- Logging Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Load Environment Variables ---
load_dotenv()

# --- Import the report generation functions ---
from AEO_Prompt_Report import generate_report as generate_aeo_report
from Schema_Prompt_Report import generate_report as generate_schema_report
from Seo_basic_Report import generate_report as generate_basic_report

app = Flask(__name__)

# --- MASTER HTML TEMPLATE ---
MERGED_HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AEO & SEO Consolidated Report</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 1200px; margin: 20px auto; padding: 20px; background-color: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .report-section { margin-bottom: 40px; border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
        h1, h2, h3 { color: #333; }
        h1 { text-align: center; }
        pre { background-color: #eee; padding: 15px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Consolidated AEO & SEO Report</h1>
        <p style="text-align: center;">Generated on: {{ date }}</p>
        
        <div id="basic-report" class="report-section">{{- basic_report_html | safe -}}</div>
        <div id="aeo-report" class="report-section">{{- aeo_report_html | safe -}}</div>
        <div id="schema-report" class="report-section">{{- schema_report_html | safe -}}</div>

    </div>
</body>
</html>
"""

# --- Database Function ---
def save_report_to_db(user_id, user_email, customer_name, url, html_content):
    # (This function remains the same)
    conn = None
    try:
        conn = psycopg2.connect(os.environ.get("DATABASE_URL"))
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO aeo_reports (user_id, user_email, customer_name, url, html, created_at)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;""",
            (user_id, user_email, customer_name, url, html_content, datetime.now())
        )
        report_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        logging.info(f"Successfully saved report to database with ID: {report_id}")
        return report_id
    except Exception as e:
        logging.error(f"DATABASE ERROR: Could not save report. Reason: {e}")
        return None
    finally:
        if conn is not None:
            conn.close()

# --- Main API Endpoint ---
@app.route('/aeo-report', methods=['POST'])
def run_full_report():
    data = request.get_json()
    required_fields = ['customer_name', 'url', 'userId', 'userEmail']
    if not data or not all(field in data for field in required_fields):
        return "Error: Please provide all required fields.", 400

    customer_name = data['customer_name']
    url = data['url']
    user_id = data['userId']
    user_email = data['userEmail']
    
    logging.info(f"--- STARTING NEW REPORT FOR {customer_name} ({url}) ---")

    # 1. Run audit script
    try:
        command = ["python", "seo_audit_extd.py", customer_name, url]
        process = subprocess.run(command, capture_output=True, text=True, check=True, encoding='utf-8')
        script_stdout = process.stdout.strip()
        logging.info("STEP 1: seo_audit_extd.py ran successfully.")
        logging.info(f"--> OUTPUT PREVIEW: {script_stdout[:500]}...")
    except Exception as e:
        logging.error(f"STEP 1 FAILED: seo_audit_extd.py. Reason: {e}")
        return "Error during crawling phase.", 500

    # 2. Run all three reporting flows in parallel
    logging.info("STEP 2: Starting parallel report generation (AEO, Schema, Basic).")
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future_aeo = executor.submit(generate_aeo_report, script_stdout, customer_name)
        future_schema = executor.submit(generate_schema_report, script_stdout, customer_name)
        future_basic = executor.submit(generate_basic_report, script_stdout, customer_name)

        # Retrieve results
        aeo_html = future_aeo.result()
        schema_html = future_schema.result()
        basic_html = future_basic.result()

    logging.info("All report flows completed. Merging HTML.")

    # 3. Merge HTML
    final_html = render_template_string(
        MERGED_HTML_TEMPLATE,
        date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        basic_report_html=basic_html,
        aeo_report_html=aeo_html,
        schema_report_html=schema_html
    )
    
    # 4. Save to Database
    logging.info("STEP 4: Saving final merged report to database.")
    save_report_to_db(user_id, user_email, customer_name, url, final_html)
    
    # 5. Return Final HTML Response
    logging.info(f"--- REPORT FOR {customer_name} COMPLETED ---")
    return final_html, 200, {'Content-Type': 'text/html'}

if __name__ == '__main__':
    app.run(debug=True, port=5000)