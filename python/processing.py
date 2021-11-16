import sys
import time
#print("hello from my butt")

#check that we know which file to process
if len(sys.argv) == 1:   
    sys.exit("Fail! Please input a file")

#open the file in write mode
f = open(sys.argv[1], "r")
print("Current number on the file : " + f.read())

def write_to_file(data):
    with open(sys.argv[1],"w") as f:
        f.write(str(data))

with open(sys.argv[1], "r") as f:
    for line in f:
        time.sleep(2)
        n = int(line)
        n+=1
        write_to_file(n)
        print("New number : " + str(n))


