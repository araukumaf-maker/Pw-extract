"""PW study material dashboard.

The original entrypoint was named ``streamlit.py``.  That shadows the
Streamlit package itself when the app starts, so the runnable entrypoint is
now ``app.py``.
"""

from __future__ import annotations

import io
import os
import zipfile
from typing import Any

import requests
import streamlit as st
from dotenv import load_dotenv

from core.announcer import fetch_announcements
from core.content import (
    fetch_batches,
    fetch_dpp,
    fetch_notes,
    fetch_subjects,
    fetch_topics,
)
from core.generate_token import get_token, send_otp
from core.utils import verify_token


load_dotenv()


def save_token(token: str) -> None:
    st.session_state["token"] = token.strip()


def load_token() -> str | None:
    token = st.session_state.get("token")
    return token.strip() if isinstance(token, str) and token.strip() else None


def delete_token() -> None:
    st.session_state.pop("token", None)
    st.session_state.pop("all_batches", None)
    st.session_state.pop("token_checked", None)


def check_token(token: str | None) -> bool:
    if not token:
        return False
    return bool(verify_token(token).get("success"))


def media_url(attachment: dict[str, Any]) -> str:
    base_url = str(attachment.get("baseUrl") or "").rstrip("/")
    key = str(attachment.get("key") or "").lstrip("/")
    return f"{base_url}/{key}" if base_url and key else ""


def zip_files(file_dict: dict[str, str]) -> io.BytesIO:
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for filename, url in file_dict.items():
            try:
                response = requests.get(url, timeout=30)
                response.raise_for_status()
                zip_file.writestr(filename, response.content)
            except requests.RequestException:
                continue
    archive.seek(0)
    return archive


@st.cache_data(ttl=300, show_spinner=False)
def prefetch_all_batches_subjects_topics(token: str) -> dict[str, Any]:
    """Load the user's course tree once and cache it for five minutes."""
    batches = fetch_batches(token)
    result: dict[str, Any] = {}

    for batch in batches if isinstance(batches, list) else []:
        batch_id = batch.get("_id") or batch.get("id") or batch.get("slug")
        batch_slug = batch.get("slug")
        if not batch_id or not batch_slug:
            continue

        subjects_data: dict[str, Any] = {}
        for subject in fetch_subjects(token, batch_slug):
            subject_id = subject.get("_id") or subject.get("id") or subject.get("slug")
            subject_slug = subject.get("slug")
            if not subject_id or not subject_slug:
                continue

            topics_data: dict[str, Any] = {}
            for topic in fetch_topics(token, batch_slug, subject_slug):
                topic_id = topic.get("_id") or topic.get("id") or topic.get("slug")
                if topic_id:
                    topics_data[topic_id] = topic

            subjects_data[subject_id] = {
                "subject": subject,
                "topics": topics_data,
            }

        result[batch_id] = {"batch": batch, "subjects": subjects_data}

    return result


def render_attachments(
    entries: list[dict[str, Any]],
    archive_label: str,
    archive_name: str,
) -> None:
    files: dict[str, str] = {}
    visible_files = 0

    for entry in reversed(entries):
        topic_name = entry.get("topic") or "Untitled"
        for index, attachment in enumerate(entry.get("attachments", [])):
            url = media_url(attachment)
            if not url:
                continue

            filename = attachment.get("name") or f"{topic_name}-{index + 1}.pdf"
            filename = str(filename)
            files[filename] = url
            visible_files += 1

            columns = st.columns([7, 1, 1])
            columns[0].write(filename)
            columns[1].markdown(f"[Open]({url})")
            try:
                response = requests.get(url, timeout=30)
                response.raise_for_status()
                columns[2].download_button(
                    "Download",
                    response.content,
                    file_name=filename,
                    mime="application/pdf",
                    key=f"download-{archive_name}-{visible_files}",
                )
            except requests.RequestException:
                columns[2].write("Unavailable")

    if files:
        if st.button(archive_label, key=f"prepare-{archive_name}"):
            archive = zip_files(files)
            st.download_button(
                "Download ZIP",
                archive,
                file_name=f"{archive_name}.zip",
                mime="application/zip",
                key=f"zip-{archive_name}",
            )
    else:
        st.info("No downloadable files were found for this topic.")


def login_page() -> None:
    st.title("PW Study Material Dashboard")
    st.caption("Use your own pw.live account to access enrolled course resources.")
    left, right = st.columns(2)

    with left:
        st.subheader("Login with OTP")
        country_code = st.text_input("Country code", value="+91", max_chars=5)
        phone = st.text_input("Phone number")
        if st.button("Send OTP", key="send-otp"):
            if not phone.strip() or not country_code.strip():
                st.warning("Enter both a country code and phone number.")
            else:
                response = send_otp(phone.strip(), country_code.strip())
                if response.get("success"):
                    st.session_state["otp_sent"] = True
                    st.success("OTP sent.")
                else:
                    st.error(response.get("error_message", "Could not send OTP."))

        if st.session_state.get("otp_sent"):
            otp = st.text_input("One-time password", type="password")
            if st.button("Verify OTP and log in", key="verify-otp"):
                if not otp.strip():
                    st.warning("Enter the OTP.")
                else:
                    response = get_token(phone.strip(), otp.strip())
                    if response.get("success"):
                        save_token(response["access_token"])
                        st.session_state.pop("otp_sent", None)
                        st.rerun()
                    else:
                        st.error(response.get("error_message", "Invalid OTP."))

    with right:
        st.subheader("Use an existing session token")
        token = st.text_area("Access token", type="password", height=100)
        if st.button("Verify token and log in", key="verify-token"):
            token = token.strip()
            if not token:
                st.warning("Paste an access token first.")
            elif check_token(token):
                save_token(token)
                st.rerun()
            else:
                st.error("That token is invalid or expired.")


def main() -> None:
    st.set_page_config(page_title="PW Study Material Dashboard", layout="wide")
    token = load_token()

    if not token:
        login_page()
        return

    if "token_checked" not in st.session_state:
        with st.spinner("Checking your session..."):
            st.session_state["token_checked"] = check_token(token)

    if not st.session_state["token_checked"]:
        delete_token()
        st.warning("Your session has expired. Please log in again.")
        login_page()
        return

    with st.sidebar:
        st.title("PW Vault")
        st.caption("Notes and DPPs from your enrolled batches")
        if st.button("Log out", key="logout"):
            delete_token()
            st.session_state.clear()
            st.rerun()

    if "all_batches" not in st.session_state:
        with st.spinner("Loading your batches, subjects and chapters..."):
            st.session_state["all_batches"] = prefetch_all_batches_subjects_topics(token)

    all_batches = st.session_state.get("all_batches", {})
    if not all_batches:
        st.warning("No enrolled batches or study material were found.")
        if st.button("Refresh course list", key="refresh-batches"):
            st.session_state.pop("all_batches", None)
            st.rerun()
        return

    st.title("PW Study Material Dashboard")
    batch_ids = list(all_batches)
    batch_id = st.selectbox(
        "Batch",
        batch_ids,
        format_func=lambda item: all_batches[item]["batch"].get("name", item),
    )
    selected_batch = all_batches[batch_id]["batch"]
    batch_slug = selected_batch.get("slug")

    subjects = all_batches[batch_id]["subjects"]
    if not subjects:
        st.info("No subjects were found in this batch.")
        return

    subject_ids = list(subjects)
    subject_id = st.selectbox(
        "Subject",
        subject_ids,
        format_func=lambda item: subjects[item]["subject"].get("subject", item),
    )
    selected_subject = subjects[subject_id]["subject"]
    subject_slug = selected_subject.get("slug")

    topics = subjects[subject_id]["topics"]
    if not topics:
        st.info("No chapters were found for this subject.")
        return

    topic_ids = list(topics)
    topic_id = st.selectbox(
        "Chapter / topic",
        topic_ids,
        format_func=lambda item: topics[item].get("name", item),
    )
    selected_topic = topics[topic_id]
    topic_slug = selected_topic.get("slug")
    topic_name = selected_topic.get("name") or "Selected topic"

    content_type = st.radio(
        "Content",
        ["Notes", "DPP", "Announcements"],
        horizontal=True,
    )

    if content_type == "Notes":
        st.subheader(f"Notes — {topic_name}")
        render_attachments(
            fetch_notes(token, batch_slug, subject_slug, topic_slug),
            "Prepare notes ZIP",
            f"{topic_name}-notes",
        )
    elif content_type == "DPP":
        st.subheader(f"DPP — {topic_name}")
        render_attachments(
            fetch_dpp(token, batch_slug, subject_slug, topic_slug),
            "Prepare DPP ZIP",
            f"{topic_name}-dpp",
        )
    else:
        st.subheader(f"Announcements — {selected_batch.get('name', 'Batch')}")
        announcements = fetch_announcements(token, selected_batch.get("_id") or batch_slug)
        if isinstance(announcements, dict) and announcements.get("success"):
            for announcement in announcements.get("announcements", []):
                with st.container(border=True):
                    st.write(announcement.get("announcement") or "Announcement")
                    if announcement.get("scheduleTime"):
                        st.caption(announcement["scheduleTime"])
                    attachment = announcement.get("attachment")
                    if attachment:
                        url = media_url(attachment)
                        if url:
                            st.markdown(f"[Open attachment]({url})")
        else:
            st.info("No announcements were found.")


if __name__ == "__main__":
    main()