# Phone + computer downloads (Electron21 Starter Kit)

One store item can now have a separate download for each device: Android (APK), Windows, Mac, Linux.
When a buyer taps Download they see "Choose your download", with their own device listed first.
If an item has only one device file, it downloads straight away. Items with no device files work exactly as before.

## Steps (about 10 minutes)
1. Create the new table (once):
   `npx wrangler d1 execute smart21store-db --remote --file=backend/store-schema-v6.sql`
2. Deploy: `npx wrangler deploy`
3. The Starter Kit is currently a physical product ("Hardware"). To make it a downloadable app, run once:
   `npx wrangler d1 execute smart21store-db --remote --command "UPDATE store_items SET kind='Files', file_type='apk', stock=NULL, ships_on=NULL WHERE name='Electron21 Starter Kit'"`
   (Skip this if you want to keep selling the physical kit. Better: add a new item for the app instead.)
4. Sign in as admin, open the Admin tab, scroll to "Add an app file for a device".
   Choose the item, choose "Android phone (APK)", pick your .apk file, press "Upload device file".
   Repeat with "Windows computer" and your .exe / .msi installer (and Mac / Linux if you have them).
5. Open the item in the store and tap Download to test on a phone and a computer.

## Notes
- You must already have the finished APK and desktop installer. The store hosts and delivers them; it does not build them.
- People must own the item (bought it, or tapped Install on a free item) before the download works.
- Large files: uploads go through the Worker, so keep each file under about 100 MB.
- Upload a file again for the same device to replace the old one.
