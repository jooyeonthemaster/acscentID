
from PIL import Image

def analyze_layout(image_path):
    try:
        img = Image.open(image_path).convert('RGB')
        w, h = img.size
        css_w = 430
        css_h = 932
        scale_y = css_h / h
        
        pixels = img.load()
        center_x = w // 2
        
        print(f"Analyzing {w}x{h} (CSS {css_w}x{css_h})")
        
        is_in_element = False
        element_start_y = 0
        
        for y in range(h):
            p = pixels[center_x, y]
            brightness = sum(p)
            # Use a slightly different threshold or logic since noise was high
            # Maybe look for specific border color again?
            # Amber: R>200, G>150, B<100
            is_border = (p[0] > 150 and p[1] > 100 and p[2] < 100 and brightness < 600)
            
            # Or just "not white"
            is_dark = brightness < 720
            
            if is_dark and not is_in_element:
                is_in_element = True
                element_start_y = y
            elif not is_dark and is_in_element:
                is_in_element = False
                height = y - element_start_y
                css_h_val = height * scale_y
                
                # Filter noise
                if css_h_val > 10: 
                    css_top = element_start_y * scale_y
                    print(f"BLOCK: Top={css_top:.1f}, H={css_h_val:.1f}, Bottom={css_top+css_h_val:.1f}")

    except Exception as e:
        print(e)

if __name__ == "__main__":
    analyze_layout('public/images/shareback/backimage.png')
