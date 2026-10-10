import os
import plistlib
import json

def get_safari_reading_list():
    bookmarks_path = os.path.expanduser('~/Library/Safari/Bookmarks.plist')
    
    if not os.path.exists(bookmarks_path):
        return {"error": "Bookmarks.plist not found"}
    
    try:
        with open(bookmarks_path, 'rb') as f:
            plist = plistlib.load(f)
    except PermissionError:
        return {"error": "Permission denied. Please grant Full Disk Access to your terminal."}
    except Exception as e:
        return {"error": str(e)}

    def find_reading_list(node):
        if isinstance(node, dict):
            if node.get('Title') == 'com.apple.ReadingList':
                return node.get('Children', [])
            for key, value in node.items():
                result = find_reading_list(value)
                if result:
                    return result
        elif isinstance(node, list):
            for item in node:
                result = find_reading_list(item)
                if result:
                    return result
        return None

    reading_list_items = find_reading_list(plist)
    
    results = []
    if reading_list_items:
        for item in reading_list_items:
            reading_list_data = item.get('ReadingListNonSync', {})
            results.append({
                "title": item.get('URIDictionary', {}).get('title', 'No Title'),
                "url": item.get('URLString', ''),
                "date_added": reading_list_data.get('DateAdded', ''),
                "preview_text": reading_list_data.get('PreviewText', '')
            })
            
    return results

if __name__ == "__main__":
    items = get_safari_reading_list()
    print(json.dumps(items, indent=2))
