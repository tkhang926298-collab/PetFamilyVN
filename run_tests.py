import subprocess

with open('test_output.txt', 'w') as f:
    subprocess.run(['python', '-m', 'pytest', 'tests/admin_tests/'], stdout=f, stderr=subprocess.STDOUT)
