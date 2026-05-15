import re

with open("/home/mieai/Documents/TDTT/Tourist_Assistant/nginx/conf.d/default.conf", "r") as f:
    content = f.read()

# Extract the /login block
login_block_match = re.search(r'(    location /login \{\n(?:.*?\n)+?    \})', content, re.MULTILINE)
if not login_block_match:
    print("Could not find /login block")
    exit(1)

login_block = login_block_match.group(1)

def create_block(path):
    # Replace /login with /path
    # Replace proxy_pass $login_url/api/auth/login; with proxy_pass $login_url/api/auth/path;
    new_block = login_block.replace("location /login {", f"location {path} {{")
    new_block = new_block.replace("proxy_pass $login_url/api/auth/login;", f"proxy_pass $login_url/api/auth{path};")
    return new_block

new_blocks = [
    create_block("/register"),
    create_block("/google"),
    create_block("/forgot-password")
]

# Insert the new blocks after the /login block
new_content = content.replace(login_block, login_block + "\n\n" + "\n\n".join(new_blocks))

with open("/home/mieai/Documents/TDTT/Tourist_Assistant/nginx/conf.d/default.conf", "w") as f:
    f.write(new_content)

print("Successfully added routes")
