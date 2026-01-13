# seo_insights.py
import pandas as pd

# ------------------------------
# Enhanced Interpret Functions
# ------------------------------

def interpret_meta(meta_df):
    if meta_df is None or meta_df.empty:
        return {
            "summary": "No meta data available.",
            "meaning": "Meta titles and descriptions are essential for search engine visibility and click-through rates.",
            "red_flags": ["No meta data was collected — this suggests a crawling issue or missing extraction."],
            "details": "Each page should have a unique and descriptive meta title and meta description."
        }

    total = len(meta_df)
    missing_titles = int(meta_df.get("title_missing", pd.Series([0])).sum())
    missing_desc = int(meta_df.get("description_missing", pd.Series([0])).sum())

    summary = f"Out of {total} pages, {missing_titles} missing titles, {missing_desc} missing descriptions."
    meaning = "Meta tags help search engines understand content and influence click-through rates in SERPs."
    red_flags = []
    if missing_titles > 0:
        red_flags.append(f"{missing_titles} pages missing titles (should be 0).")
    if missing_desc > 0:
        red_flags.append(f"{missing_desc} pages missing descriptions (should be minimized).")
    details = "Pages without titles or descriptions risk poor rankings and unattractive snippets in search results."

    return {"summary": summary, "meaning": meaning, "red_flags": red_flags, "details": details}


def interpret_headings(headings_df):
    if headings_df is None or headings_df.empty:
        return {
            "summary": "No heading data available.",
            "meaning": "Headings (especially H1) are important for SEO structure and keyword targeting.",
            "red_flags": ["No heading data found — may indicate issues in extraction or missing HTML structure."],
            "details": "Each page should have one clear H1. Multiple or missing H1s weaken SEO hierarchy."
        }

    total = len(headings_df)
    missing_h1 = int(headings_df.get("missing_h1", pd.Series([0])).sum())
    multiple_h1 = int(headings_df.get("multiple_h1", pd.Series([0])).sum())

    summary = f"Checked {total} pages: {missing_h1} missing H1, {multiple_h1} with multiple H1s."
    meaning = "H1s provide structure and signal primary topic to search engines."
    red_flags = []
    if missing_h1 > 0:
        red_flags.append(f"{missing_h1} pages missing H1 (bad for SEO).")
    if multiple_h1 > 0:
        red_flags.append(f"{multiple_h1} pages have multiple H1s (confuses search engines).")
    details = "Ideally, each page should have exactly one descriptive H1."

    return {"summary": summary, "meaning": meaning, "red_flags": red_flags, "details": details}


def interpret_canonicals(canon_df):
    if canon_df is None or canon_df.empty:
        return {
            "summary": "No canonical data available.",
            "meaning": "Canonical tags help prevent duplicate content issues.",
            "red_flags": ["No canonical data collected — may result in duplicate content risks."],
            "details": "Every page should declare a self-referencing or valid canonical tag."
        }

    total = len(canon_df)
    missing = int(canon_df.get("canonical_missing", pd.Series([0])).sum())
    self_refs = int(canon_df.get("self_referencing", pd.Series([0])).sum())

    summary = f"{missing}/{total} pages missing canonicals, {self_refs} are self-referencing."
    meaning = "Canonicals consolidate duplicate URLs to avoid dilution of ranking signals."
    red_flags = []
    if missing > 0:
        red_flags.append(f"{missing} pages missing canonical tags.")
    if self_refs < total:
        red_flags.append(f"{total - self_refs} pages not self-referencing (check canonical setup).")
    details = "Incorrect canonicals can cause indexation issues and duplicate content penalties."

    return {"summary": summary, "meaning": meaning, "red_flags": red_flags, "details": details}


def interpret_status(status_df):
    if status_df is None or status_df.empty:
        return {
            "summary": "No status code data available.",
            "meaning": "HTTP status codes reflect crawlability and indexability.",
            "red_flags": ["No status codes detected — may indicate a crawl issue."],
            "details": "Healthy sites should mostly return 200 OK. 4xx/5xx indicate errors that harm SEO."
        }

    total = len(status_df)
    code_counts = status_df.get("status", pd.Series(dtype=int)).value_counts()
    top_codes = ", ".join([f"{k}: {v}" for k, v in code_counts.items()][:5])

    summary = f"Checked {total} URLs. Status distribution → {top_codes}"
    meaning = "Status codes show accessibility of pages to users and bots."
    red_flags = []
    if any(str(c).startswith("4") for c in code_counts.index):
        red_flags.append("Presence of 4xx errors (broken links).")
    if any(str(c).startswith("5") for c in code_counts.index):
        red_flags.append("Presence of 5xx errors (server issues).")
    details = "Fixing error codes ensures pages can be crawled and indexed."

    return {"summary": summary, "meaning": meaning, "red_flags": red_flags, "details": details}


def interpret_sitemap_vs_crawl(comp_df):
    if comp_df is None or comp_df.empty:
        return {
            "summary": "No sitemap vs crawl comparison available.",
            "meaning": "Comparing sitemap and crawl ensures all important URLs are indexed.",
            "red_flags": ["No data available to compare sitemap and crawl."],
            "details": "Pages missing from sitemap or crawl may be unindexed or orphaned."
        }

    orphaned = int(comp_df.get("orphaned", pd.Series([0])).sum())
    uncatalogued = int(comp_df.get("uncatalogued", pd.Series([0])).sum())
    total = len(comp_df)

    summary = f"Compared {total} URLs. {orphaned} orphaned, {uncatalogued} uncatalogued."
    meaning = "Orphaned pages are not internally linked; uncatalogued pages may miss exposure."
    red_flags = []
    if orphaned > 0:
        red_flags.append(f"{orphaned} orphaned pages found.")
    if uncatalogued > 0:
        red_flags.append(f"{uncatalogued} uncatalogued pages found.")
    details = "Ensure all important pages appear in both crawl and sitemap."

    return {"summary": summary, "meaning": meaning, "red_flags": red_flags, "details": details}


def interpret_url_structure(url_struct_df):
    if url_struct_df is None or url_struct_df.empty:
        return {
            "summary": "No URL structure data available.",
            "meaning": "URL length and depth affect crawl efficiency and user experience.",
            "red_flags": ["No URL structure data found."],
            "details": "Short, descriptive URLs are better for SEO."
        }

    total = len(url_struct_df)
    avg_depth = url_struct_df["url_path_depth"].mean() if "url_path_depth" in url_struct_df else 0
    avg_length = url_struct_df["url_length"].mean() if "url_length" in url_struct_df else 0

    summary = f"Analyzed {total} URLs. Avg path depth = {avg_depth:.2f}, Avg length = {avg_length:.1f}."
    meaning = "Deep or long URLs can be harder for users and crawlers."
    red_flags = []
    if avg_depth > 5:
        red_flags.append("High average URL depth (may be buried in site).")
    if avg_length > 100:
        red_flags.append("Excessive URL length (not SEO-friendly).")
    details = "Shallow, clean URLs improve crawlability and CTR."

    return {"summary": summary, "meaning": meaning, "red_flags": red_flags, "details": details}

def interpret_redirects(redirects_df):
    if redirects_df is None or redirects_df.empty:
        return {
            "summary": "No redirects found ",
            "meaning": "Site structure is clean. No redirect chains wasting crawl budget.",
            "red_flags": [],
            "details": "No action needed. Having zero redirects is optimal."
        }

    total_steps = len(redirects_df)
    unique_urls = redirects_df["url"].nunique() if "url" in redirects_df else 0
    longest_chain = redirects_df["redirect_times"].max() if "redirect_times" in redirects_df else None

    summary = (
        f"Found {total_steps} redirect steps across {unique_urls} unique URLs ."
        + (f" Longest chain has {longest_chain} redirects." if longest_chain else "")
    )

    meaning = "Redirects affect crawl efficiency and link equity. Long chains should be avoided."
    red_flags = []
    if longest_chain and longest_chain > 2:
        red_flags.append(f"Long redirect chain detected (length {longest_chain}).")

    details = "Use direct 301 redirects. Avoid chains and loops to preserve crawl budget and SEO value."

    return {
        "summary": summary,
        "meaning": meaning,
        "red_flags": red_flags,
        "details": details
    }



def interpret_internal_links(nodes_df, edges_df):
    if nodes_df is None or nodes_df.empty:
        return {
            "summary": "No internal link data available.",
            "meaning": "Internal linking distributes PageRank and helps crawlers discover content.",
            "red_flags": ["No internal link data found."],
            "details": "A strong internal link structure boosts visibility of important pages."
        }

    total_pages = len(nodes_df)
    total_links = len(edges_df) if edges_df is not None else 0
    top_pages = nodes_df.sort_values("pagerank", ascending=False).head(3)["url"].tolist()

    summary = f"Graph has {total_pages} pages, {total_links} links. Top pages (PageRank): {', '.join(top_pages)}."
    meaning = "Pages with higher PageRank are considered more important internally."
    red_flags = []
    if total_links / max(total_pages, 1) < 2:
        red_flags.append("Low average internal links per page (site may be poorly connected).")
    details = "Ensure important pages are linked often and early in navigation."

    return {"summary": summary, "meaning": meaning, "red_flags": red_flags, "details": details}

def interpret_robots(robots_df):
    """
    Interprets robots.txt DataFrame returned by advertools.robotstxt_to_df()
    Produces summary, meaning, red_flags, details
    """

    if robots_df is None or robots_df.empty:
        return {
            "summary": "No robots.txt data available.",
            "meaning": "The robots.txt file could not be fetched or is empty.",
            "red_flags": ["Missing or empty robots.txt — search engines may crawl everything by default."],
            "details": "Please ensure robots.txt is available and has at least User-agent and Disallow/Allow directives."
        }

    # Count the number of directives
    total = len(robots_df)
    
    # How many directives of type Disallow, Allow, User-agent, Sitemap, Crawl-delay
    directive_counts = robots_df['directive'].value_counts().to_dict()
    # Example: {"User-agent": 3, "Disallow": 10, "Allow": 5, "Sitemap":1, ...}

    # Summary
    summary = f"robots.txt contains {total} directives: " + \
              ", ".join([f"{cnt} {d.lower()}" for d, cnt in directive_counts.items()])

    meaning = ("robots.txt file provides directives such as which user-agents are allowed or disallowed, "
               "where sitemap is located etc. Interpreting these helps understand what search engines can or cannot crawl.")

    red_flags = []
    details_list = []

    # Red flag: No Disallow
    if directive_counts.get("Disallow", 0) == 0:
        red_flags.append("No 'Disallow' directives — entire site may be open to all bots.")
        details_list.append("Without 'Disallow', parts of site that should be private or irrelevant may be indexed or crawled unnecessarily.")

    # Red flag: No User-agent
    if directive_counts.get("User-agent", 0) == 0:
        red_flags.append("No 'User-agent' directives — robots.txt is malformed or missing control contexts.")
        details_list.append("User-agent directives define which bots rules apply to. Without them other directives might apply to nobody or be ambiguous.")

    # Check private paths blocked
    # Find Disallow directives, see if they block sensitive paths (like /admin, /login, /private etc.)
    disallows = robots_df[robots_df['directive'] == "Disallow"]
    if not disallows.empty:
        # list of content values
        paths = disallows['content'].astype(str).tolist()
        # we can examine some typical sensitive keywords
        sensitive = ["admin", "login", "private", "wp-admin"]
        found = []
        for s in sensitive:
            for p in paths:
                if s in p.lower():
                    found.append(s)
                    break
        if not found:
            red_flags.append("No disallow for sensitive/private paths (e.g. admin, login).")
            details_list.append("Consider adding Disallow rules for admin, login, private sections to avoid unwanted crawling.")

    # Check if sitemap directive exists
    if "Sitemap" not in directive_counts:
        red_flags.append("No 'Sitemap' directive — crawling and indexing might miss sitemap hints.")
        details_list.append("Including the sitemap location in robots.txt is good for search engines to find all pages.")

    # Other check: Crawl-delay maybe exists
    # Good but optional

    details = " ".join(details_list) if details_list else "No obvious issues found."

    return {
        "summary": summary,
        "meaning": meaning,
        "red_flags": red_flags,
        "details": details
    }

import re

def interpret_ngrams(ngram_df, n=1, top_k=10):
    """
    Interpret n-gram report (from CSVs like word, abs_freq).
    Returns SEO-focused insight.
    """

    if ngram_df is None or ngram_df.empty:
        return {
            "summary": f"No {n}-gram data available.",
            "meaning": f"{n}-grams show frequent {('words' if n==1 else 'phrases')} "
                       "on the site. Helpful for understanding topical focus.",
            "red_flags": [],
            "details": "No data was extracted."
        }

    # Normalize column names
    df = ngram_df.rename(columns={ngram_df.columns[0]: "ngram", ngram_df.columns[1]: "count"})
    df["ngram"] = df["ngram"].astype(str).str.strip()
    df["count"] = df["count"].astype(int)

    # Sort and get top_k
    df = df.sort_values("count", ascending=False)
    top = df.head(top_k)

    total_unique = len(df)
    total_occurrences = int(df["count"].sum())

    # Check for noise/symbols
    noisy = df[df["ngram"].str.contains(r"[|&]", regex=True)]
    branded = df[df["ngram"].str.contains(r"welzin", case=False)]

    red_flags = []
    if not noisy.empty and (noisy["count"].sum() / total_occurrences) > 0.1:
        red_flags.append("Symbols like | or & dominate top n-grams — content extraction may include layout artifacts.")
    if not branded.empty and (branded["count"].sum() / total_occurrences) > 0.3:
        red_flags.append("Brand name dominates content — topical variety is limited.")
    if any(term in df["ngram"].str.lower().tolist() for term in ["policy", "terms", "conditions", "privacy"]):
        red_flags.append("Legal boilerplate (privacy/terms/policy) appears frequently — may overshadow topical content.")

    summary = f"Found {total_unique} unique {n}-grams, {total_occurrences} total occurrences."
    meaning = (f"{n}-grams show the site's most frequent {('words' if n==1 else 'phrases')}. "
               "They indicate branding focus, legal text presence, and topical keywords.")
    details = "Top examples: " + ", ".join([f"{row['ngram']} ({row['count']})" for _, row in top.iterrows()])

    return {
        "summary": summary,
        "meaning": meaning,
        "red_flags": red_flags,
        "details": details
    }

def interpret_rendering_mode(df):
    if df is None or df.empty:
        return {
            "summary": "No rendering mode information was collected.",
            "meaning": "Could not determine if the site is server-side or client-side rendered.",
            "red_flags": [],
            "details": ""
        }

    mode = df.iloc[0]["rendering_mode"]
    if "Client-Side" in mode:
        red_flags = ["Site appears to be client-side rendered. Crawlers may miss content without JS execution."]
    else:
        red_flags = []

    return {
        "summary": f"Rendering mode detected: {mode}",
        "meaning": "This describes whether the site delivers HTML directly (SSR) or builds it in-browser (CSR).",
        "red_flags": red_flags,
        "details": f"Text length: {df.iloc[0]['text_length']}, Script count: {df.iloc[0]['script_count']}"
    }

def interpret_schema(df):
    if df is None or df.empty:
        return {
            "summary": "No schema.org data was collected.",
            "meaning": "The site may not provide structured data.",
            "red_flags": [],
            "details": ""
        }

    present = df.iloc[0]["schema_present"]
    types = df.iloc[0]["schema_types"]

    if not present:
        return {
            "summary": "No schema.org structured data detected on the homepage.",
            "meaning": "Structured data can help search engines understand your content.",
            "red_flags": ["No schema.org data found."],
            "details": ""
        }
    else:
        return {
            "summary": f"Schema.org structured data detected: {types}",
            "meaning": "Structured data helps enhance visibility in search features.",
            "red_flags": [],
            "details": f"Schema types: {types}"
        }

def interpret_llms(llms_df):
    """
    Interpret llms.txt directives analysis.
    Expects a DataFrame with columns like ['directive','content'] similar to robots_df.
    Returns a dict with summary, meaning, red_flags, details.
    """
    if llms_df is None or getattr(llms_df, 'empty', True):
        return {
            "summary": "No llms.txt found or file is empty.",
            "meaning": "Sites may optionally provide llms.txt to declare policies for AI crawlers and LLMs.",
            "red_flags": [],
            "details": "It's optional; absence is not necessarily a problem. If AI crawler policy matters to you, consider adding it."
        }

    total = len(llms_df)
    directive_counts = llms_df['directive'].value_counts().to_dict() if 'directive' in llms_df.columns else {}
    summary = f"llms.txt contains {total} lines" + (": " + ", ".join([f"{cnt} {d.lower()}" for d, cnt in directive_counts.items()]) if directive_counts else "")
    meaning = "llms.txt controls access and usage guidelines for AI agents and LLM crawlers."
    red_flags = []
    details = []

    # Simple checks
    if 'User-agent' not in directive_counts and 'user-agent' not in directive_counts:
        red_flags.append("No 'User-agent' directives in llms.txt (rules may be ambiguous).")
    if 'Disallow' in directive_counts and directive_counts.get('Disallow', 0) > 20:
        details.append("Many Disallow rules present — ensure important AI agents still have access where intended.")

    return {
        "summary": summary,
        "meaning": meaning,
        "red_flags": red_flags,
        "details": " ".join(details) if details else "No obvious issues found."
    }
