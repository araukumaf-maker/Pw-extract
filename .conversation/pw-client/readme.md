# PW Extractor

PW Extractor is a dashboard app for students of [Physics Wallah (PW)](https://www.pw.live/) to access, view, and download course resources such as notes and DPPs from their enrolled PW batches and subjects.

## Quick Start

1. Clone the repository:

   ```
   git clone https://github.com/viraj-sh/pw-extractor.git
   cd pw-extractor
   ```

2. Create and activate a Python virtual environment:

   ```
   python -m venv venv
   ```

   ```
   # On Windows:
   venv\Scripts\activate
   ```

   ```
   # On Mac/Linux:
   source venv/bin/activate
   ```

3. Upgrade pip and install dependencies:

   ```
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Run the dashboard:

   ```
   streamlit run streamlit.py
   ```

## Usage

- After launching, the app opens in your browser.
- **Login options:**
  - Paste an existing token from a PW web session (recommended; keeps other sessions active).
  - Alternatively, generate a new token with OTP (this will log out from any other active sessions).

### How to get your PW session token

1. Either visit https://www.pw.live/ and log in, or simply use a browser tab where you are already logged in to pw.live.
2. Open the browser developer tools (usually F12 or right click > Inspect), go to the Network tab, and refresh the page.
3. Filter by `token`, click the `verify-token` request, and look for the `Authorization` header in the request headers.
4. Copy the value after `Bearer ` and paste it in the login form of this dashboard.

### Features

- Select your batch, subject, and chapter/topic.
- View or download notes and DPPs individually, or download all as a zip file.
- DPP Quiz and Announcements are upcoming features.
- Logging out removes the local session token; your other PW sessions remain unaffected.

## Purpose

This app is designed to help PW students manage and access their enrolled study resources—notes, DPPs, and other course files—more efficiently. It does not provide access to video lectures or any protected content. Usage is limited to your own legitimately enrolled courses on pw.live.

## Upcoming Features

- Dashboard design improvements
- DPP quiz viewing and downloads with solutions
- Announcements integration and export to Discord/Telegram/Email
- Enhanced error handling and new user help
- More file management features

We welcome suggestions. Please use GitHub Issues or pull requests for any feedback or contributions.

## Bugs & Contributing

If you encounter problems, open an issue on GitHub. Contributions are welcome.

## Disclaimer

This project is only for legitimate users of [pw.live](https://www.pw.live/). Unauthorized or unintended use is not supported. Piracy or commercial misuse is not tolerated.
