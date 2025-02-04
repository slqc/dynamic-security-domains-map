import yaml
import json
import argparse
import os
#import pdb; pdb.set_trace()

def convert_yaml_to_json(yaml_file, json_file):
    with open(yaml_file, 'r') as yml:
        data = yaml.safe_load(yml)
    
    with open(json_file, 'w') as jsn:
        json.dump(data, jsn, indent=4)

def main():
    parser = argparse.ArgumentParser(description='Convert YAML file to JSON file.')
    parser.add_argument('input', type=str, help='Input YAML file path.')
    parser.add_argument('output', nargs='?', default=None, type=str, help='Output JSON file path (optional). If not provided, the output filename will be the same as the input with a .json extension.')
    args = parser.parse_args()

    # Get absolute path to avoid issues with relative paths
    yaml_file = os.path.abspath(args.input)
    
    # Determine JSON file name
    if args.output is None:
        json_file = os.path.splitext(yaml_file)[0] + '.json'
    else:
        json_file = os.path.abspath(args.output)
    
    convert_yaml_to_json(yaml_file, json_file)
    print(f'Successfully converted {yaml_file} to {json_file}')

if __name__ == '__main__':
    main()