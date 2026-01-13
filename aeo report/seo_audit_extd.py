# seo_audit_extd.py
import advertools as adv
import pandas as pd
import logging
import argparse
import os
import networkx as nx
import re
from urllib.parse import urlparse
from datetime import datetime
import sys
import requests
from bs4 import BeautifulSoup
import json
import shutil
from playwright.sync_api import sync_playwright


# import insights module (assumes seo_insights.py in same folder)
from seo_insights import (
    interpret_meta, interpret_headings, interpret_canonicals, interpret_status,
    interpret_sitemap_vs_crawl, interpret_url_structure, interpret_redirects,
    interpret_internal_links, interpret_ngrams, interpret_robots, interpret_rendering_mode, interpret_schema,
    interpret_llms
)

# ----------------- Logger -----------------
def setup_logger(log_dir):
    os.makedirs(log_dir, exist_ok=True)
    log_filename = os.path.join(log_dir, 'aeo_analysis.log')

    logger = logging.getLogger("aeo_audit")
    logger.setLevel(logging.INFO)
    if logger.hasHandlers():
        logger.handlers.clear()

    fh = logging.FileHandler(log_filename, mode="w", encoding="utf-8")
    fh.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
    sh = logging.StreamHandler()
    sh.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))

    logger.addHandler(fh)
    logger.addHandler(sh)
    return logger

# ----------------- Crawl -----------------
def crawl_site(url, output_file, logger, page_limit=500):
    logger.info(f"Starting crawl for {url} with page limit {page_limit}")
    try:
        custom_settings = {"CLOSESPIDER_PAGECOUNT": page_limit}
        adv.crawl([url], output_file, follow_links=True, custom_settings=custom_settings)
        logger.info(f"Crawl finished. Data saved to {output_file}")
        crawldf = pd.read_json(output_file, lines=True)
        logger.info(f"Crawl data loaded into DataFrame. Shape: {crawldf.shape}")
        return crawldf
    except Exception as e:
        logger.error(f"An error occurred during crawling: {e}")
        return None

    # ----------------- HTML Structure Extractor -----------------
def extract_structure_from_url(url, logger):
    """
    Fetches a URL and extracts only the structure:
      - tag names
      - attribute names (not values)
      - counts per tag

    Returns:
      {
        "tags": [ {"tag": tag, "attrs": [attr1, attr2, ...]}, ... ],
        "summary": [ {"tag": tag, "count": N, "attrs": [...]}, ... ]
      }
    """
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(url, timeout=10, headers=headers)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        all_tags = []
        counts = {}
        attr_map = {}

        for tag in soup.find_all(True):
            tag_name = tag.name
            attr_names = list(tag.attrs.keys())

            all_tags.append({
                "tag": tag_name,
                "attrs": attr_names
            })

            # count occurrences
            counts[tag_name] = counts.get(tag_name, 0) + 1

            # track attribute names seen per tag
            if tag_name not in attr_map:
                attr_map[tag_name] = set()
            attr_map[tag_name].update(attr_names)

        summary = [
            {
                "tag": t,
                "count": c,
                "attrs": sorted(list(attr_map.get(t, [])))
            }
            for t, c in sorted(counts.items(), key=lambda x: x[0])
        ]

        logger.info(f"Extracted structure: {len(summary)} unique tag types from {url}")
        return {"tags": all_tags, "summary": summary}

    except Exception as e:
        logger.error(f"Failed to extract structure from {url}: {e}")
        return {"tags": [], "summary": []}


# ----------------- Robots.txt -----------------
def analyze_robots_txt(url, logger):
    """
    Analyze robots.txt rules for the given site.
    Returns a DataFrame with structured rules.
    """
    try:
        # Build robots.txt URL if not given
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"

        logger.info(f"Fetching robots.txt from {robots_url}")
        robots_df = adv.robotstxt_to_df(robots_url)

        if robots_df is None or robots_df.empty:
            logger.warning(f"No robots.txt rules found at {robots_url}")
            return None

        logger.info(f"Robots.txt parsed with {robots_df.shape[0]} rules")
        return robots_df

    except Exception as e:
        logger.error(f"Error parsing robots.txt: {e}")
        return None

def analyze_llms_txt(url, logger):
    """
    Analyze llms.txt rules for the given site (if present).
    Similar to robots.txt, but focused on LLM crawlers.
    Returns a DataFrame with crawler directives.
    """
    from urllib.parse import urlparse

    parsed = urlparse(url)
    llms_url = f"{parsed.scheme}://{parsed.netloc}/llms.txt"

    try:
        logger.info(f"Fetching llms.txt from {llms_url}")
        resp = requests.get(llms_url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})

        if resp.status_code != 200:
            logger.warning(f"No llms.txt found at {llms_url} (status {resp.status_code})")
            return None

        lines = [l.strip() for l in resp.text.splitlines() if l.strip()]
        rules = []
        for line in lines:
            if line.lower().startswith(("allow", "disallow", "user-agent")):
                parts = line.split(":", 1)
                if len(parts) == 2:
                    directive, content = parts[0].strip(), parts[1].strip()
                    rules.append({"directive": directive, "content": content})
        df = pd.DataFrame(rules)
        logger.info(f"Parsed {len(df)} rules from llms.txt")
        return df

    except Exception as e:
        logger.error(f"Error fetching/parsing llms.txt: {e}")
        return None


# ----------------- Sitemaps -----------------
def parse_sitemap(url, logger):
    try:
        sm_df = adv.sitemap_to_df(url, recursive=True)
        if sm_df is None or sm_df.empty:
            logger.warning(f"Sitemap empty at {url}")
            return None
        logger.info(f"Sitemap parsed: {url} ({len(sm_df)} rows)")
        return sm_df
    except Exception as e:
        logger.warning(f"Could not parse sitemap at {url}: {e}")
        return None

def get_sitemap_df(base_url, logger):
    robots_url = base_url.rstrip("/") + "/robots.txt"
    logger.info(f"Checking robots.txt for sitemaps: {robots_url}")
    sitemap_df = parse_sitemap(robots_url, logger)
    if sitemap_df is not None:
        return sitemap_df

    common_paths = [
        "/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml",
        "/sitemap1.xml", "/sitemap-news.xml", "/sitemap-pages.xml",
        "/sitemap-posts.xml", "/sitemap-products.xml", "/sitemap_index/sitemap.xml",
    ]

    all_sitemaps = []
    for path in common_paths:
        sm_url = base_url.rstrip("/") + path
        logger.info(f"Trying fallback sitemap: {sm_url}")
        sm_df = parse_sitemap(sm_url, logger)
        if sm_df is not None:
            all_sitemaps.append(sm_df)

    if all_sitemaps:
        combined = pd.concat(all_sitemaps, ignore_index=True).drop_duplicates("loc")
        logger.info(f"Collected {len(combined)} unique URLs from fallback sitemaps")
        return combined

    logger.warning("No sitemap found in robots.txt or fallback locations.")
    return None

# ----------------- Reports (existing) -----------------
def normalize_url(u):
    if pd.isna(u):
        return u
    u = u.strip().lower()
    if u.endswith("/") and len(u) > len("http://a"):
        return u.rstrip("/")
    return u

def report_meta(crawl_df, logger):
    logger.info("Generating meta report...")
    df = crawl_df[["url", "title", "meta_desc"]].copy()
    df["title_length"] = df["title"].fillna("").str.len()
    df["desc_length"] = df["meta_desc"].fillna("").str.len()
    df["title_missing"] = df["title"].isna() | (df["title"].fillna("") == "")
    df["description_missing"] = df["meta_desc"].isna() | (df["meta_desc"].fillna("") == "")
    logger.info(f"Meta report generated with {len(df)} rows")
    return df

def report_headings(crawl_df, logger):
    logger.info("Generating headings report...")
    df = crawl_df[["url", "h1"]].copy()
    df["h1_count"] = df["h1"].apply(lambda x: len(x) if isinstance(x, list) else (1 if isinstance(x, str) and x.strip() else 0))
    df["missing_h1"] = df["h1_count"] == 0
    df["multiple_h1"] = df["h1_count"] > 1
    logger.info(f"Headings report generated with {len(df)} rows")
    return df

def report_canonicals(crawl_df, logger):
    logger.info("Generating canonicals report...")
    df = crawl_df[["url", "canonical"]].copy()
    df["canonical_missing"] = df["canonical"].isna()
    df["self_referencing"] = df.apply(lambda row: (row["canonical"] == row["url"]) if pd.notna(row["canonical"]) else False, axis=1)
    logger.info(f"Canonicals report generated with {len(df)} rows")
    return df

def report_status_codes(crawl_df, logger):
    logger.info("Generating status codes report...")
    cols = ["url"]
    if "status" in crawl_df.columns: cols.append("status")
    if "redirect_urls" in crawl_df.columns: cols.append("redirect_urls")
    if "redirect_times" in crawl_df.columns: cols.append("redirect_times")
    if "redirect_reasons" in crawl_df.columns: cols.append("redirect_reasons")
    df = crawl_df[cols].copy()
    logger.info(f"Status codes report generated with {len(df)} rows")
    return df

def report_sitemap_vs_crawl(sitemap_df, crawl_df, logger):
    logger.info("Generating sitemap vs crawl comparison...")
    crawl_df = crawl_df.copy()
    crawl_df["url_norm"] = crawl_df["url"].apply(normalize_url)
    crawl_urls = set(crawl_df["url_norm"])

    if sitemap_df is None or sitemap_df.empty:
        logger.warning("No sitemap data; creating empty comparison.")
        return pd.DataFrame(columns=["url", "in_crawl", "in_sitemap", "orphaned", "uncatalogued", "lastmod", "sitemap"])

    keep_cols = [c for c in ["loc", "lastmod", "sitemap", "changefreq", "priority"] if c in sitemap_df.columns]
    sm_df = sitemap_df[keep_cols].copy()
    sm_df["loc_norm"] = sm_df["loc"].apply(normalize_url)
    site_urls = set(sm_df["loc_norm"])

    all_urls = crawl_urls.union(site_urls)
    rows = []
    for u in all_urls:
        in_crawl = u in crawl_urls
        in_sitemap = u in site_urls
        if in_sitemap:
            row = sm_df[sm_df["loc_norm"] == u].iloc[0]
            lastmod = row.get("lastmod", None)
            sitemap_source = row.get("sitemap", None)
        else:
            lastmod = None
            sitemap_source = None
        rows.append({
            "url": u,
            "in_crawl": in_crawl,
            "in_sitemap": in_sitemap,
            "orphaned": in_sitemap and not in_crawl,
            "uncatalogued": in_crawl and not in_sitemap,
            "lastmod": lastmod,
            "sitemap": sitemap_source,
        })
    df = pd.DataFrame(rows)
    logger.info(f"Sitemap vs Crawl comparison generated with {len(df)} rows")
    return df


def build_overview(crawl_df, meta_df, headings_df, canon_df, sitemap_df, comp_df,  
                   robots_df, llms_df, url_struct_df, redirects_df, nodes_df, edges_df,
                   ngram_1_df, ngram_2_df, ngram_3_df, rendering_df, schema_df, logger):
    """
    Builds overview section — instead of raw counts, returns red/green status indicators.
    """

    logger.info("Building overview report...")

    def flag(cond):
       
        return "&#x1F534;" if cond else "&#x1F7E2;"  # red or green circle

    try:
        overview = {
            "Crawl Data": [flag(crawl_df is None or crawl_df.empty)],
            "Sitemap & Crawl": [
                flag(
                    (sitemap_df is None or sitemap_df.empty)
                    or (comp_df["orphaned"].sum() > 0)
                    or (comp_df["uncatalogued"].sum() > 0)
                )
            ],
            "Meta Data": [
                flag(meta_df["title_missing"].sum() > 0 or meta_df["description_missing"].sum() > 0)
            ],
            "Headings (H1)": [flag(headings_df["multiple_h1"].sum() > 0)],
            "Canonicals": [flag(canon_df["canonical_missing"].sum() > 0)],
            "Robots.txt": [flag(robots_df is None or robots_df.empty)],
            "LLMs.txt": [flag(llms_df is None or llms_df.empty)],
            "URL Structure": [flag(url_struct_df is None or url_struct_df.empty)],
            "Redirects": [flag(redirects_df is None or redirects_df.empty)],
            "Internal Links": [flag(nodes_df is None or nodes_df.empty)],
            "Schema": [
                flag(schema_df is None or schema_df.empty or schema_df["schema_present"].sum() == 0)
            ],
            "Rendering Mode": [flag(rendering_df is None or rendering_df.empty)],
        }

        df = pd.DataFrame(overview)
        logger.info(f"Overview status built: {df.to_dict(orient='records')[0]}")
        return df

    except Exception as e:
        logger.error(f"Error building overview: {e}")
        return pd.DataFrame()


# ----------------- New Reports (fixed) -----------------
def report_url_structure(crawl_df, logger):
    logger.info("Generating URL structure report...")
    try:
        df = adv.url_to_df(crawl_df["url"].dropna())
        logger.info(f"URL structure report generated with {len(df)} rows")
        return df
    except Exception as e:
        logger.error(f"Error in URL structure analysis: {e}")
        return pd.DataFrame()

def report_redirects(crawl_df, logger):
    logger.info("Generating redirect report...")
    try:
        df = adv.crawlytics.redirects(crawl_df)
        logger.info(f"Redirect report generated with {len(df)} rows")
        return df
    except Exception as e:
        logger.error(f"Error in redirect analysis: {e}")
        return pd.DataFrame()

def report_internal_links(crawl_df, domain_regex, logger, resolve_redirects=True):
    logger.info("Generating internal link analysis...")
    try:
        link_df = adv.crawlytics.links(crawl_df, internal_url_regex=domain_regex)
        if link_df is None or link_df.empty:
            logger.warning("adv.crawlytics.links returned no data.")
            return pd.DataFrame(), pd.DataFrame()

        internal_links = link_df[link_df.get("internal", False)].copy()
        if internal_links.empty:
            logger.warning("No internal links found after filtering.")
            return pd.DataFrame(), pd.DataFrame()

        # --- Redirect resolution (same as before) ---
        redirect_map = {}
        if resolve_redirects:
            try:
                redirects_df = adv.crawlytics.redirects(crawl_df)
                if redirects_df is not None and not redirects_df.empty:
                    redirect_map = dict(zip(redirects_df["url"], redirects_df["redirect_url"]))
            except Exception as e:
                logger.warning(f"Could not compute redirects for resolution: {e}")

        def resolve_url(u):
            if pd.isna(u):
                return u
            seen = set()
            cur = u
            while cur in redirect_map and cur not in seen:
                seen.add(cur)
                cur = redirect_map[cur]
            return cur

        internal_links["source_resolved"] = internal_links["url"].apply(resolve_url)
        internal_links["target_resolved"] = internal_links["link"].apply(resolve_url)

        # --- ✅ NEW: Drop nofollow links before building graph ---
        dofollow_links = internal_links[~internal_links["nofollow"].fillna(False)]

        if domain_regex:
            is_internal = dofollow_links["target_resolved"].astype(str).apply(
                lambda x: bool(re.search(domain_regex, x)) if pd.notna(x) else False
            )
            edges = dofollow_links[is_internal][["source_resolved", "target_resolved"]].rename(
                columns={"source_resolved": "source", "target_resolved": "target"}
            )
        else:
            edges = dofollow_links[["source_resolved", "target_resolved"]].rename(
                columns={"source_resolved": "source", "target_resolved": "target"}
            )

        if edges.empty:
            logger.warning("No dofollow internal edges remain after filtering.")
            return pd.DataFrame(), pd.DataFrame()

        # --- Build graph & compute PageRank ---
        G = nx.from_pandas_edgelist(edges, source="source", target="target", create_using=nx.DiGraph())
        indeg = dict(G.in_degree())
        outdeg = dict(G.out_degree())

        try:
            pr = nx.pagerank(G)
        except Exception:
            pr = {n: 0.0 for n in G.nodes()}

        nodes = pd.DataFrame({
            "url": list(G.nodes()),
            "in_degree": [indeg.get(n, 0) for n in G.nodes()],
            "out_degree": [outdeg.get(n, 0) for n in G.nodes()],
            "pagerank": [pr.get(n, 0) for n in G.nodes()],
        })

        logger.info(f"Internal link analysis produced {len(nodes)} nodes and {len(edges)} edges (nofollow ignored)")
        return nodes.sort_values("pagerank", ascending=False), edges

    except Exception as e:
        logger.error(f"Error in internal link analysis: {e}")
        return pd.DataFrame(), pd.DataFrame()


def report_ngrams(crawl_df, logger, n=2):
    logger.info(f"Generating {n}-gram analysis (phrase_len={n})...")
    try:
        text_series = (
            crawl_df.get("title", pd.Series([""] * len(crawl_df))).fillna("").astype(str) + " "
            + crawl_df.get("meta_desc", pd.Series([""] * len(crawl_df))).fillna("").astype(str) + " "
            + crawl_df.get("h1", pd.Series([""] * len(crawl_df))).fillna("").astype(str)
        )
        text_list = text_series.tolist()
        ngram_df = adv.word_frequency(text_list, phrase_len=n)
        logger.info(f"{n}-gram report generated with {len(ngram_df)} rows")
        return ngram_df
    except Exception as e:
        logger.error(f"Error in {n}-gram analysis: {e}")
        return pd.DataFrame()

def safe_run(func, log, name="", expected_cols=None, *args, **kwargs):
    """
    Run a function safely, catching errors and empty results.
    Returns an empty DataFrame with expected_cols if available.
    
    :param func: function to run
    :param log: main logger (used for logging inside safe_run)
    :param name: name of the section/function (string)
    :param expected_cols: columns to enforce for empty fallback DataFrame
    :param *args, **kwargs: passed directly to func
    """
    try:
        df = func(*args, **kwargs)
        if df is None or (hasattr(df, "empty") and df.empty):
            log.warning(f"{name} returned no data. Using empty DataFrame.")
            return pd.DataFrame(columns=expected_cols or [])
        return df
    except Exception as e:
        log.error(f"{name} encountered an issue: {e}. Using empty DataFrame.")
        return pd.DataFrame(columns=expected_cols or [])

def sample_rendering_mode_from_crawl(crawl_df, logger, sample_limit=20):
    """
    Check rendering mode by comparing raw HTML (requests) vs rendered DOM (Playwright).
    Returns a DataFrame with: url, rendering_mode, raw_text_len, rendered_text_len
    """
    try:
        

        if crawl_df is None or crawl_df.empty:
            logger.warning("No crawl_df provided to sample_rendering_mode_from_crawl.")
            return pd.DataFrame(columns=["url","rendering_mode","raw_text_len","rendered_text_len"])

        urls = list(crawl_df["url"].dropna().astype(str).unique())[:sample_limit]
        results = []
        headers = {"User-Agent": "Mozilla/5.0"}

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            for u in urls:
                try:
                    # Raw HTML fetch
                    resp = requests.get(u, timeout=10, headers=headers)
                    raw_text = BeautifulSoup(resp.text, "html.parser").get_text(strip=True)
                    raw_len = len(raw_text)

                    # Rendered fetch
                    page.goto(u, timeout=20000)
                    rendered_html = page.content()
                    rendered_text = BeautifulSoup(rendered_html, "html.parser").get_text(strip=True)
                    rendered_len = len(rendered_text)

                    # Compare
                    if raw_len > 0.8 * rendered_len:
                        mode = "Likely SSR"
                    elif rendered_len > raw_len * 2:
                        mode = "Likely CSR"
                    else:
                        mode = "Hybrid / Unclear"

                    results.append({
                        "url": u,
                        "rendering_mode": mode,
                        "raw_text_len": raw_len,
                        "rendered_text_len": rendered_len
                    })

                except Exception as e:
                    logger.debug(f"rendering check failed for {u}: {e}")
                    results.append({
                        "url": u,
                        "rendering_mode": "Unknown",
                        "raw_text_len": 0,
                        "rendered_text_len": 0
                    })

            browser.close()
        return pd.DataFrame(results)

    except Exception as e:
        logger.error(f"sample_rendering_mode_from_crawl failed: {e}")
        return pd.DataFrame(columns=["url","rendering_mode","raw_text_len","rendered_text_len"])


def scan_schema_for_pages(crawl_df=None, sitemap_df=None, logger=None, sample_limit=20, prefer="crawl"):
    """
    Scans a sample of pages (from crawl_df or sitemap_df) for JSON-LD schema.
    Adds a column 'source' to indicate whether URLs came from 'crawl' or 'sitemap'.

    Logic:
      - Prefer crawl_df if it contains > 1 unique URLs
      - Otherwise fall back to sitemap_df
      - If both missing, return empty DataFrame
    """
    import requests, json
    from bs4 import BeautifulSoup

    # --- decide source ---
    urls, source = [], None
    if prefer == "crawl" and crawl_df is not None and not crawl_df.empty:
        unique_crawl_urls = list(crawl_df["url"].dropna().astype(str).unique())
        if len(unique_crawl_urls) > 1:   # ✅ require >1 crawled page
            urls = unique_crawl_urls[:sample_limit]
            source = "crawl"

    # fallback to sitemap
    if not urls and sitemap_df is not None and not sitemap_df.empty:
        urls = list(sitemap_df["loc"].dropna().astype(str).unique())[:sample_limit]
        source = "sitemap"

    if not urls:
        if logger:
            logger.warning("No valid URLs found for schema scan (both crawl and sitemap empty).")
        return pd.DataFrame(columns=["url","schema_present","schema_types","source"])

    # --- scan selected URLs ---
    results = []
    headers = {"User-Agent":"Mozilla/5.0"}
    for u in urls:
        try:
            resp = requests.get(u, timeout=8, headers=headers)
            soup = BeautifulSoup(resp.text, "html.parser")
            scripts = soup.find_all("script", type="application/ld+json")
            found_types = []
            for s in scripts:
                try:
                    data = json.loads(s.string) if s.string else None
                    if data:
                        if isinstance(data, list):
                            for d in data:
                                if "@type" in d:
                                    found_types.append(d["@type"])
                        elif "@type" in data:
                            found_types.append(data["@type"])
                except Exception:
                    continue
            results.append({
                "url": u,
                "schema_present": bool(found_types),
                "schema_types": ", ".join(sorted(set(found_types))),
                "source": source
            })
        except Exception as e:
            if logger:
                logger.debug(f"Schema scan failed for {u}: {e}")
            results.append({"url": u, "schema_present": False, "schema_types": "", "source": source})

    return pd.DataFrame(results)




# ----------------- Insight report builder -----------------
def save_insight_report(customer_name, output_dir, logger,
                        meta_df, headings_df, canon_df, status_df,
                        comp_df, url_struct_df, redirects_df,
                        nodes_df, edges_df,
                        ngram_1_df, ngram_2_df, ngram_3_df,
                        robots_df, rendering_df, schema_df, llms_df,
                        preview_rows=5):

    logger.info("Starting report generation...")

  
    sections = []

    def _add_section(name, func, df, *args):
        logger.info(f"Interpreting {name}...")
        try:
            if df is None or df.empty:
                insight = {
                    "summary": f"No data collected for {name}.",
                    "meaning": f"{name} insights are not available.",
                    "red_flags": [],
                    "details": "Check crawler/parsing. Not always an issue."
                }
            else:
                insight = func(df, *args)
        except Exception as e:
            logger.warning(f"Issue in {name}: {e}")
            insight = {
                "summary": f"{name} insights could not be generated.",
                "meaning": f"{name} check failed.",
                "red_flags": [],
                "details": "Check logs for details."
            }

        table_html = ""
        if df is not None and not df.empty:
            try:
                table_html = df.head(preview_rows).to_html(index=False, escape=False)
            except Exception as e:
                logger.warning(f"Could not render preview table for {name}: {e}")

        sections.append({
            "title": name.replace("_", " "),
            "summary": insight["summary"],
            "meaning": insight["meaning"],
            "red_flags": insight.get("red_flags", []),
            "details": insight.get("details", ""),
            "table": table_html
        })

    # Add all sections
    _add_section("Rendering Mode", interpret_rendering_mode, rendering_df)
    _add_section("Robots", interpret_robots, robots_df)
    _add_section("LLMs", interpret_llms, llms_df)
    _add_section("Meta", interpret_meta, meta_df)
    _add_section("Headings", interpret_headings, headings_df)
    _add_section("Schema Check", interpret_schema, schema_df)
    _add_section("Canonicals", interpret_canonicals, canon_df)
    _add_section("Status", interpret_status, status_df)
    _add_section("Sitemap vs Crawl", interpret_sitemap_vs_crawl, comp_df)
    _add_section("URL Structure", interpret_url_structure, url_struct_df)
    _add_section("Redirects", interpret_redirects, redirects_df)
    _add_section("Internal Links", interpret_internal_links, nodes_df, edges_df)
    _add_section("Ngrams 1", interpret_ngrams, ngram_1_df, 1)
    _add_section("Ngrams 2", interpret_ngrams, ngram_2_df, 2)
    _add_section("Ngrams 3", interpret_ngrams, ngram_3_df, 3)

    try:
        with open(css_path, "r") as f:
            css_content = f.read()
    except Exception as e:
        logger.warning(f"Could not read CSS: {e}")
        css_content = ""  # fallback


    # Start HTML
    html_parts = [
    "<html><head><meta charset='utf-8'>",
    f"<title>AEO Audit Report - {customer_name}</title>",
    "<style>",
    css_content,  
    "</style>",
    "</head><body>",
    "<header>",
    f"<h1>AEO Audit Report - {customer_name}</h1>",
    f"<p>Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>",
    "</header>",
    "<div class='container'>"
]

    # --- Top Metrics Dashboard ---
    overview_file = os.path.join(output_dir, f"{customer_name}_overview.csv")
    client_actions = []  # Collect recommendations here

    if os.path.exists(overview_file):
        try:
            import pandas as pd
            overview_df = pd.read_csv(overview_file)
            if not overview_df.empty:
                row = overview_df.iloc[0]
                html_parts.append("<div class='top-metrics'>")
                for label, val in row.items():
                    color = "green"
                    if "missing" in label.lower() and val > 0:
                        color = "red"
                    elif "orphaned" in label.lower() or "uncatalogued" in label.lower():
                        color = "orange"
                    html_parts.append(f"""
                        <div class='metric'>
                            <h3>{label.replace('_',' ').title()}</h3>
                            <span class='badge {color}'>{val}</span>
                        </div>
                    """)
                html_parts.append("</div>")
        except Exception as e:
            logger.warning(f"Could not load overview metrics: {e}")

    # --- Prepare Key Recommendations ---
    for sec in sections:
        if sec['red_flags']:
            client_actions.extend(sec['red_flags'])

    # Add rendering mode warning if CSR dominates
    if rendering_df is not None and not rendering_df.empty:
        try:
            mode_counts = rendering_df["rendering_mode"].value_counts()
            dominant_mode = mode_counts.idxmax()
            if "CSR" in dominant_mode or "Client" in dominant_mode:
                client_actions.append(
                    "Significant reliance on Client-Side Rendering — may block crawlers. Consider server-side or hybrid rendering."
                )
        except Exception:
            pass

    # --- Key Recommendations Card ---
    if client_actions:
        html_parts.append("<div class='card'>")
        html_parts.append("<h2>Key Recommendations</h2><ul>")
        for act in client_actions:
            if "missing" in act.lower() or "error" in act.lower():
                badge = "<span class='badge red'>Urgent</span>"
            elif "orphaned" in act.lower() or "uncatalogued" in act.lower():
                badge = "<span class='badge orange'>Attention</span>"
            elif "rendering" in act.lower():
                badge = "<span class='badge orange'>Attention</span>"
            else:
                badge = "<span class='badge green'>Info</span>"
            html_parts.append(f"<li>{act} {badge}</li>")
        html_parts.append("</ul>")
        html_parts.append("<p><b>Next Steps:</b> Fix the above issues to improve visibility, crawl efficiency, and ranking potential.</p>")
        html_parts.append("</div>")

    # --- Detailed Sections ---
    for sec in sections:
        html_parts.append("<div class='card'>")
        html_parts.append(f"<h2>{sec['title']}</h2>")
        html_parts.append(f"<p class='summary'><b>Summary:</b> {sec['summary']}</p>")
        html_parts.append(f"<p><b>Meaning:</b> {sec['meaning']}</p>")

        if sec['red_flags']:
            html_parts.append("<p><b>Red Flags:</b></p><ul>")
            for rf in sec['red_flags']:
                html_parts.append(f"<li class='redflag'>⚠️ {rf}</li>")
            html_parts.append("</ul>")
        else:
            html_parts.append("<p class='good'>✅ No major red flags.</p>")

        html_parts.append(f"<p><b>Details:</b> {sec['details']}</p>")

        # Add dominant rendering mode if section is Rendering Mode
        if sec['title'] == "Rendering Mode" and rendering_df is not None and not rendering_df.empty:
            try:
                mode_counts = rendering_df["rendering_mode"].value_counts()
                dominant_mode = mode_counts.idxmax()
                html_parts.append(f"<p><b>Dominant Rendering Mode:</b> <span class='badge gray'>{dominant_mode}</span></p>")
            except Exception as e:
                logger.warning(f"Could not calculate dominant rendering mode: {e}")

        # Table / Preview Data
        if sec.get("table"):
            html_parts.append("<p><b>Preview Data:</b></p>")
            html_parts.append(sec["table"])

        html_parts.append("</div>")

    # --- Close HTML ---
    html_parts.append("</div></body></html>")
    html_content = "\n".join(html_parts)

    # --- Save Report ---
    html_file = os.path.join(output_dir, f"{customer_name}_report.html")
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html_content)

    # Optional stdout log
    if rendering_df is not None and not rendering_df.empty:
        mode_counts = rendering_df["rendering_mode"].value_counts()
        dominant_mode = mode_counts.idxmax()
        print(f"Dominant Rendering Mode: {dominant_mode}")
        if "CSR" in dominant_mode or "Client" in dominant_mode:
            print("⚠️ Warning: Client-Side Rendering dominant, may block crawlers.")
    else:
        print("No rendering mode data available.")

    logger.info(f"HTML report saved: {html_file}")



# ----------------- Main -----------------
def main(customer_name, url, domain_regex=None):
    customer_name = customer_name.capitalize()
    date_str = datetime.now().strftime("%Y-%m-%d")
    log_dir = f"./output/logs/{date_str}/{customer_name}"
    output_dir = os.path.join(log_dir, "aeo")
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    logger = setup_logger(log_dir)
    logger.info(f"=== AEO Audit started for {customer_name} - {url} ===")

    # ---------------- Crawl ----------------
    crawl_output_jsonl = os.path.join(output_dir, f"{customer_name}_crawl.jsonl")
    
    crawldf = safe_run(crawl_site, logger, "Crawl",
                       expected_cols=[
    "url", "title", "meta_desc", "canonical", "h1", "h2", "h3", "jsonld", "body_text", "status",
    "og:title", "og:description", "og:image", "twitter:title", "twitter:description", "twitter:image",
    "links_url", "links_text", "links_nofollow", "nav_links_text", "nav_links_url",
    "header_links_text", "header_links_url", "footer_links_text", "footer_links_url"],
                       url=url, output_file=crawl_output_jsonl, logger=logger)
    try:
        crawldf.to_csv(os.path.join(output_dir, f"{customer_name}_aeo.csv"), index=False)
    except Exception as e:
        logger.warning(f"Could not save crawl CSV: {e}")

    print(crawldf.head(1).to_json(orient="records", lines=True))
    


    # ----------------- Extract HTML Structure -----------------
    structure_data = extract_structure_from_url(url, logger)

    if structure_data["summary"]:
        summary_csv = os.path.join(output_dir, f"{customer_name}_tag_structure_summary.csv")
        pd.DataFrame(structure_data["summary"]).to_csv(summary_csv, index=False)

        details_csv = os.path.join(output_dir, f"{customer_name}_tag_structure_details.csv")
        pd.DataFrame(structure_data["tags"]).to_csv(details_csv, index=False)

        logger.info(f"Saved HTML structure results: {summary_csv}, {details_csv}")




    # ---------------- Robots.txt ----------------
    robots_df = safe_run(analyze_robots_txt, logger, "Robots.txt",
                         expected_cols=["directive","content"], url=url, logger=logger)
    
        # ---------------- LLMs.txt ----------------
    llms_df = safe_run(analyze_llms_txt, logger, "LLMs.txt",
                       expected_cols=["directive","content"], url=url, logger=logger)


    # ---------------- Sitemap ----------------
    sitemap_df = safe_run(get_sitemap_df, logger, "Sitemap",
                          expected_cols=["loc","lastmod","sitemap"], base_url=url, logger=logger)

    schema_df = safe_run(scan_schema_for_pages, logger, "Schema Check",
                     expected_cols=["url","schema_present","schema_types","source"],
                     crawl_df=crawldf, sitemap_df=sitemap_df, logger=logger, sample_limit=20, prefer="crawl")



    # ---------------- Reports ----------------
    meta_df     = safe_run(report_meta, logger, "Meta Report", expected_cols=["url","title","meta_desc"], crawl_df=crawldf, logger=logger)
    headings_df = safe_run(report_headings, logger, "Headings Report", expected_cols=["url","h1"], crawl_df=crawldf, logger=logger)
    canon_df    = safe_run(report_canonicals, logger, "Canonicals", expected_cols=["url","canonical"], crawl_df=crawldf, logger=logger)
    status_df   = safe_run(report_status_codes, logger, "Status Codes", expected_cols=["url","status"], crawl_df=crawldf, logger=logger)
    comp_df     = safe_run(report_sitemap_vs_crawl, logger, "Sitemap vs Crawl",
                           expected_cols=["url","in_crawl","in_sitemap"],
                           sitemap_df=sitemap_df, crawl_df=crawldf, logger=logger)
  
    

    # ---------------- New Reports ----------------
    url_struct_df = safe_run(report_url_structure, logger, "URL Structure", expected_cols=["url"], crawl_df=crawldf, logger=logger)
    redirects_df  = safe_run(report_redirects, logger, "Redirects", expected_cols=["url","redirect_url"], crawl_df=crawldf, logger=logger)
    
    rendering_df = safe_run(sample_rendering_mode_from_crawl, logger, "Rendering Mode",
                        expected_cols=["url","rendering_mode","text_length","script_count"],
                        crawl_df=crawldf, logger=logger, sample_limit=20)

    

    # ---------------- Internal Links ----------------
    if domain_regex is None:
        parsed = urlparse(url)
        host = parsed.netloc.split(":")[0]
        if host:
            domain_regex = re.escape(host)
            logger.info(f"Derived domain_regex = {domain_regex}")
        else:
            logger.warning("Could not derive domain_regex from URL; internal link analysis may be skipped.")

    nodes_df, edges_df = pd.DataFrame(), pd.DataFrame()
    if domain_regex:
        try:
            nodes_df, edges_df = report_internal_links(crawldf, domain_regex, logger, resolve_redirects=True)
        except Exception as e:
            logger.warning(f"Internal links not available: {e}")
            nodes_df, edges_df = pd.DataFrame(columns=["url"]), pd.DataFrame(columns=["source","target"])

    # ---------------- N-Grams ----------------
    ngram_1_df = safe_run(report_ngrams, logger, "Ngrams-1", expected_cols=["word","abs_freq"], crawl_df=crawldf, logger=logger, n=1)
    ngram_2_df = safe_run(report_ngrams, logger, "Ngrams-2", expected_cols=["word","abs_freq"], crawl_df=crawldf, logger=logger, n=2)
    ngram_3_df = safe_run(report_ngrams, logger, "Ngrams-3", expected_cols=["word","abs_freq"], crawl_df=crawldf, logger=logger, n=3)

    overview_df = safe_run(build_overview, logger, "Overview", 
                       expected_cols=["total_crawled", "sitemap_crawl_issues", "meta_issues", 
                                     "multiple_h1s", "missing_canonicals", "robots_rules", 
                                     "llms_rules", "unique_url_patterns", "redirects_count",
                                     "pages_with_pagerank", "unique_ngrams_1", "unique_ngrams_2", 
                                     "unique_ngrams_3", "pages_with_schema", "pages_with_rendering_data"],
                       crawl_df=crawldf, meta_df=meta_df, headings_df=headings_df,
                       canon_df=canon_df, sitemap_df=sitemap_df, comp_df=comp_df,
                       robots_df=robots_df, llms_df=llms_df, url_struct_df=url_struct_df,
                       redirects_df=redirects_df, nodes_df=nodes_df, edges_df=edges_df,
                       ngram_1_df=ngram_1_df, ngram_2_df=ngram_2_df, ngram_3_df=ngram_3_df,
                       rendering_df=rendering_df, schema_df=schema_df, logger=logger)

    # ---------------- Save Reports ----------------
    logger.info("Saving CSV reports...")
    try:
        if not overview_df.empty:   overview_df.to_csv(os.path.join(output_dir, f"{customer_name}_overview.csv"), index=False)
        if not meta_df.empty:       meta_df.to_csv(os.path.join(output_dir, f"{customer_name}_meta_report.csv"), index=False)
        if not headings_df.empty:   headings_df.to_csv(os.path.join(output_dir, f"{customer_name}_headings_report.csv"), index=False)
        if not canon_df.empty:      canon_df.to_csv(os.path.join(output_dir, f"{customer_name}_canonicals_report.csv"), index=False)
        if not status_df.empty:     status_df.to_csv(os.path.join(output_dir, f"{customer_name}_status_codes.csv"), index=False)
        if not sitemap_df.empty:    sitemap_df.to_csv(os.path.join(output_dir, f"{customer_name}_sitemap_full.csv"), index=False)
        if not comp_df.empty:       comp_df.to_csv(os.path.join(output_dir, f"{customer_name}_sitemap_vs_crawl.csv"), index=False)
        if not url_struct_df.empty: url_struct_df.to_csv(os.path.join(output_dir, f"{customer_name}_url_structure.csv"), index=False)
        if not redirects_df.empty:  redirects_df.to_csv(os.path.join(output_dir, f"{customer_name}_redirects.csv"), index=False)
        if not nodes_df.empty:      nodes_df.to_csv(os.path.join(output_dir, f"{customer_name}_internal_links_nodes.csv"), index=False)
        if not edges_df.empty:      edges_df.to_csv(os.path.join(output_dir, f"{customer_name}_internal_links_edges.csv"), index=False)
        if not ngram_1_df.empty:    ngram_1_df.to_csv(os.path.join(output_dir, f"{customer_name}_ngrams_1.csv"), index=False)
        if not ngram_2_df.empty:    ngram_2_df.to_csv(os.path.join(output_dir, f"{customer_name}_ngrams_2.csv"), index=False)
        if not ngram_3_df.empty:    ngram_3_df.to_csv(os.path.join(output_dir, f"{customer_name}_ngrams_3.csv"), index=False)
        if not rendering_df.empty:  rendering_df.to_csv(os.path.join(output_dir, f"{customer_name}_rendering_mode.csv"), index=False)
        if not schema_df.empty:     schema_df.to_csv(os.path.join(output_dir, f"{customer_name}_schema_check.csv"), index=False)

    except Exception as e:
        logger.error(f"Error saving CSV reports: {e}")

    # ---------------- Build HTML Report ----------------
    save_insight_report(customer_name, output_dir, logger,
                    meta_df, headings_df, canon_df, status_df,
                    comp_df, url_struct_df, redirects_df,
                    nodes_df, edges_df,
                    ngram_1_df, ngram_2_df, ngram_3_df, robots_df,
                    rendering_df,schema_df, llms_df,
                    preview_rows=5)


    logger.info("=== AEO Audit completed successfully ===")



if __name__ == "__main__":  
    parser = argparse.ArgumentParser(description="AEO Analysis Script")
    parser.add_argument("customer_name", type=str, help="Customer name")
    parser.add_argument("url", type=str, help="URL of the website to analyze")
    parser.add_argument("--domain_regex", type=str, help="Regex to identify internal links (optional)", default=None)
    args = parser.parse_args()
    main(args.customer_name, args.url, args.domain_regex)
