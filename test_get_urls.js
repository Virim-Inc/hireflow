async function checkGetUrls() {
  const urls = [
    'https://workdrive.zoho.in/open/f9naz9cb33f54200e4e738d90b6f7d857c0f7',
    'https://workdrive.zoho.in/file/f9naz9cb33f54200e4e738d90b6f7d857c0f7',
    'https://workdrive.zoho.com/open/f9naz9cb33f54200e4e738d90b6f7d857c0f7',
    'https://workdrive.zoho.com/file/f9naz9cb33f54200e4e738d90b6f7d857c0f7'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      console.log(`${url} -> Status: ${res.status}`);
      const text = await res.text();
      console.log(`Length of response: ${text.length}`);
      if (text.includes('Ashvini') || text.includes('Ashwini')) {
        console.log(`Found candidate name in content of ${url}`);
      }
    } catch (err) {
      console.error(`Error fetching ${url}:`, err.message);
    }
  }
}
checkGetUrls();
