from playwright.sync_api import sync_playwright, expect
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        file_path = os.path.abspath('aob/test.html')
        page.goto(f'file://{file_path}')

        # 1. Verify [div] tag with complex attributes
        div_element = page.locator('div.common[style*="float:right"]')
        style = div_element.get_attribute('style')
        assert 'background-color:#ffffcc' in style
        assert 'float:right' in style
        assert 'width:400px' in style

        # 2. Verify [r] tag's raw output
        output_area = page.locator('#render-output')
        expect(output_area).to_contain_text('[b]This bold tag should not be rendered.[/b]')

        # Ensure the <b> tag is not actually rendered
        bold_element = output_area.locator('b:text-is("This bold tag should not be rendered.")')
        expect(bold_element).to_have_count(0)


        # 3. Take a screenshot of the final state
        page.screenshot(path='jules-scratch/verification/verification.png')

        browser.close()

if __name__ == '__main__':
    run()
