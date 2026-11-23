PATRICK KAFATHE — PORTFOLIO WEBSITE
===================================
A plain HTML/CSS/JS site. Hidden admin panel: add #admin to the end of the website address
(e.g. https://yourname.github.io/site/#admin). There is no link to it on the site.
Every piece of content lives in ONE file:  data/site-data.js

HOW THE ADMIN WORKS WITH GITHUB (important)
GitHub Pages has no server, so the admin cannot change the live site directly.
1. Open the site + #admin, edit Projects / Banner / Profile / Contact / Reviews.
   Changes save as a DRAFT in your browser and you can preview them (only you see the draft).
2. Publish tab > "Download update package" gives a zip with data/site-data.js + your new pictures.
3. Unzip it over your website folder and upload the changed files to GitHub.
4. The live site now matches your draft exactly. Open #admin > Publish > "Clear draft".

PUBLISH ON GITHUB PAGES
1. Create a repository on github.com and upload ALL files/folders from this zip
   (index.html, style.css, widgets.css, admin.css, script.js, widgets.js, admin.js, data/, assets/, .nojekyll).
2. Repository > Settings > Pages > Source: "Deploy from a branch" > main > / (root) > Save.
3. After a minute your site is live at https://YOUR-USERNAME.github.io/REPO-NAME/
   (Paths are relative, so it also works in a sub-folder or on a custom domain.)

HOW TO CHANGE THINGS (edit data/site-data.js, save, upload to GitHub)
- Texts, roles, stats, services, FAQ, contact details ... edit the matching block.
- Add a project: put pictures in assets/projects/ and add an entry to  projects: [ ... ]
  (see the example in the file). Mark featured:true to show it in the sliding showcase.
- Change prices: prices live only in the PDF behind the "Check website prices" button (Contact).
  Replace assets/docs/MK-Technologies-Website-Packages.pdf (keep the same file name).
- Banner pictures (sliding images under the hero): replace the JPGs in assets/img/ (banner-*.jpg,
  1600x640) or point slides[].image to your own pictures.
- Your portrait: replace assets/profile.jpg.  Logo: replace assets/logo.png.
- Social links: fill contact.socials (leave "" to hide).
- Top announcement bar: announce.enabled = true.

REVIEWS (no server needed)
- Clients use a short form (stars, message, name). The built-in ✨ helper drafts wording for them.
- They send it to you on WhatsApp or email, with a ready-to-paste line at the bottom.
- In #admin > Reviews, paste their message and tap "Add pasted review", then publish as above.
- Optional: put a Formspree (or similar) form URL in reviews.endpoint and reviews arrive in your
  inbox directly.

TIP: if a change does not show after upload, refresh with Ctrl+F5 (browsers cache files).
