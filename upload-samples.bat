@echo off
cd /d "%~dp0"
echo Uploading 38 sample files to R2...
call npx wrangler r2 object put smart21store-files/store/sample/math-lesson-pack-grade5-v1.pdf --file=sample-files\math-lesson-pack-grade5-v1.pdf --remote
call npx wrangler r2 object put smart21store-files/store/sample/math-lesson-pack-grade5-v2.pdf --file=sample-files\math-lesson-pack-grade5-v2.pdf --remote
call npx wrangler r2 object put smart21store-files/store/sample/anatomy-image-set.zip --file=sample-files\anatomy-image-set.zip --remote
call npx wrangler r2 object put smart21store-files/store/sample/electron21-circuit-library.zip --file=sample-files\electron21-circuit-library.zip --remote
call npx wrangler r2 object put smart21store-files/store/sample/game-assets-bundle.zip --file=sample-files\game-assets-bundle.zip --remote
call npx wrangler r2 object put smart21store-files/store/sample/school-report-templates.docx --file=sample-files\school-report-templates.docx --remote
call npx wrangler r2 object put smart21store-files/store/sample/welcome-videos.mp4 --file=sample-files\welcome-videos.mp4 --remote
call npx wrangler r2 object put smart21store-files/store/sample/science-experiments-grade7.pdf --file=sample-files\science-experiments-grade7.pdf --remote
call npx wrangler r2 object put smart21store-files/store/sample/english-reading-pack-grade3.pdf --file=sample-files\english-reading-pack-grade3.pdf --remote
call npx wrangler r2 object put smart21store-files/store/sample/kiswahili-hadithi-darasa4.pdf --file=sample-files\kiswahili-hadithi-darasa4.pdf --remote
call npx wrangler r2 object put smart21store-files/store/sample/geography-tanzania-workbook.pdf --file=sample-files\geography-tanzania-workbook.pdf --remote
call npx wrangler r2 object put smart21store-files/store/sample/geography-maps-pack.zip --file=sample-files\geography-maps-pack.zip --remote
call npx wrangler r2 object put smart21store-files/store/sample/kids-coding-starter.zip --file=sample-files\kids-coding-starter.zip --remote
call npx wrangler r2 object put smart21store-files/store/sample/sound-effects-pack.zip --file=sample-files\sound-effects-pack.zip --remote
call npx wrangler r2 object put smart21store-files/store/sample/quiz-bank-general.json --file=sample-files\quiz-bank-general.json --remote
call npx wrangler r2 object put smart21store-files/store/sample/gradebook-template.xlsx --file=sample-files\gradebook-template.xlsx --remote
call npx wrangler r2 object put smart21store-files/store/sample/photosynthesis-lesson-slides.pptx --file=sample-files\photosynthesis-lesson-slides.pptx --remote
call npx wrangler r2 object put smart21store-files/store/sample/weekly-lesson-plan-template.docx --file=sample-files\weekly-lesson-plan-template.docx --remote
call npx wrangler r2 object put smart21store-files/store/sample/certificates-pack.docx --file=sample-files\certificates-pack.docx --remote
call npx wrangler r2 object put smart21store-files/store/sample/science-demo-video.mp4 --file=sample-files\science-demo-video.mp4 --remote
call npx wrangler r2 object put smart21store-files/store/sample/fractions-workbook-grade6.pdf --file=sample-files\fractions-workbook-grade6.pdf --remote
call npx wrangler r2 object put smart21store-files/store/sample/algebra-basics-form1.pdf --file=sample-files\algebra-basics-form1.pdf --remote
call npx wrangler r2 object put smart21store-files/store/sample/physics-formula-cheatsheet.pdf --file=sample-files\physics-formula-cheatsheet.pdf --remote
call npx wrangler r2 object put smart21store-files/store/sample/east-africa-history-notes.pdf --file=sample-files\east-africa-history-notes.pdf --remote
call npx wrangler r2 object put smart21store-files/store/sample/chemistry-lab-safety-guide.pdf --file=sample-files\chemistry-lab-safety-guide.pdf --remote
call npx wrangler r2 object put smart21store-files/store/sample/periodic-table-images.zip --file=sample-files\periodic-table-images.zip --remote
call npx wrangler r2 object put smart21store-files/store/sample/biology-cell-diagrams.zip --file=sample-files\biology-cell-diagrams.zip --remote
call npx wrangler r2 object put smart21store-files/store/sample/phonics-audio-pack.zip --file=sample-files\phonics-audio-pack.zip --remote
call npx wrangler r2 object put smart21store-files/store/sample/kiswahili-flashcards.zip --file=sample-files\kiswahili-flashcards.zip --remote
call npx wrangler r2 object put smart21store-files/store/sample/science-vocabulary-cards.json --file=sample-files\science-vocabulary-cards.json --remote
call npx wrangler r2 object put smart21store-files/store/sample/computer-studies-intro-slides.pptx --file=sample-files\computer-studies-intro-slides.pptx --remote
call npx wrangler r2 object put smart21store-files/store/sample/budget-template.xlsx --file=sample-files\budget-template.xlsx --remote
call npx wrangler r2 object put smart21store-files/store/sample/class-timetable-template.xlsx --file=sample-files\class-timetable-template.xlsx --remote
call npx wrangler r2 object put smart21store-files/store/sample/attendance-register.xlsx --file=sample-files\attendance-register.xlsx --remote
call npx wrangler r2 object put smart21store-files/store/sample/exam-paper-template.docx --file=sample-files\exam-paper-template.docx --remote
call npx wrangler r2 object put smart21store-files/store/sample/parent-letter-templates.docx --file=sample-files\parent-letter-templates.docx --remote
call npx wrangler r2 object put smart21store-files/store/sample/maths-lesson-video.mp4 --file=sample-files\maths-lesson-video.mp4 --remote
call npx wrangler r2 object put smart21store-files/store/sample/bedtime-story-audio.mp3 --file=sample-files\bedtime-story-audio.mp3 --remote
echo Done.
pause
