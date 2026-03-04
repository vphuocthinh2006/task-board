import streamlit as st
import os

st.set_page_config(
    page_title="CS221 — Task Board",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Hide Streamlit default UI elements for a cleaner look
st.markdown("""
<style>
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    .stApp > header {display: none;}
    .block-container {
        padding: 0 !important;
        max-width: 100% !important;
    }
    iframe {
        border: none !important;
    }
</style>
""", unsafe_allow_html=True)

# Read the source files
base_dir = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(base_dir, "style.css"), "r", encoding="utf-8") as f:
    css_content = f.read()

with open(os.path.join(base_dir, "app.js"), "r", encoding="utf-8") as f:
    js_content = f.read()

with open(os.path.join(base_dir, "index.html"), "r", encoding="utf-8") as f:
    html_content = f.read()

# Inline CSS and JS into the HTML
html_content = html_content.replace(
    '<link rel="stylesheet" href="style.css">',
    f"<style>{css_content}</style>"
)
html_content = html_content.replace(
    '<script src="app.js"></script>',
    f"<script>{js_content}</script>"
)

# Render the full app inside a Streamlit component
st.components.v1.html(html_content, height=900, scrolling=True)
