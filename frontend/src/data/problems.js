export const PROBLEMS = {
  "two-sum": {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    category: "Array • Hash Table",
    description: {
      text: "Given an array of integers nums and an integer target, return indices of the two numbers in the array such that they add up to target.",
      notes: [
        "You may assume that each input would have exactly one solution, and you may not use the same element twice.",
        "You can return the answer in any order.",
      ],
    },
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
      },
      {
        input: "nums = [3,3], target = 6",
        output: "[0,1]",
      },
    ],
    constraints: [
      "2 ≤ nums.length ≤ 10⁴",
      "-10⁹ ≤ nums[i] ≤ 10⁹",
      "-10⁹ ≤ target ≤ 10⁹",
      "Only one valid answer exists",
    ],
    starterCode: {
      javascript: `function twoSum(nums, target) {
  // Write your solution here
  
}

// Test cases
console.log(twoSum([2, 7, 11, 15], 9)); // Expected: [0, 1]
console.log(twoSum([3, 2, 4], 6)); // Expected: [1, 2]
console.log(twoSum([3, 3], 6)); // Expected: [0, 1]`,
      python: `def twoSum(nums, target):
    # Write your solution here
    pass

# Test cases
print(twoSum([2, 7, 11, 15], 9))  # Expected: [0, 1]
print(twoSum([3, 2, 4], 6))  # Expected: [1, 2]
print(twoSum([3, 3], 6))  # Expected: [0, 1]`,
      java: `import java.util.*;

class Solution {
    public static int[] twoSum(int[] nums, int target) {
        // Write your solution here
        
        return new int[0];
    }
    
    public static void main(String[] args) {
        System.out.println(Arrays.toString(twoSum(new int[]{2, 7, 11, 15}, 9))); // Expected: [0, 1]
        System.out.println(Arrays.toString(twoSum(new int[]{3, 2, 4}, 6))); // Expected: [1, 2]
        System.out.println(Arrays.toString(twoSum(new int[]{3, 3}, 6))); // Expected: [0, 1]
    }
}`,
      cpp: `
#include <iostream>
#include <vector>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your solution here
        return {};
    }
};

int main() {
    Solution sol;
    vector<int> nums1 = {2, 7, 11, 15};
    vector<int> res1 = sol.twoSum(nums1, 9);
    cout << "[" << res1[0] << ", " << res1[1] << "]" << endl;

    vector<int> nums2 = {3, 2, 4};
    vector<int> res2 = sol.twoSum(nums2, 6);
    cout << "[" << res2[0] << ", " << res2[1] << "]" << endl;

    vector<int> nums3 = {3, 3};
    vector<int> res3 = sol.twoSum(nums3, 6);
    cout << "[" << res3[0] << ", " << res3[1] << "]" << endl;
    return 0;
}`,
      c: `
#include <stdio.h>
#include <stdlib.h>

/**
 * Note: The returned array must be malloced, assume caller calls free().
 */
int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    // Write your solution here
    *returnSize = 2;
    return (int*)malloc(2 * sizeof(int));
}

int main() {
    int nums1[] = {2, 7, 11, 15};
    int retSize1;
    int* res1 = twoSum(nums1, 4, 9, &retSize1);
    printf("[%d, %d]\\n", res1[0], res1[1]);
    if (res1) free(res1);

    int nums2[] = {3, 2, 4};
    int retSize2;
    int* res2 = twoSum(nums2, 3, 6, &retSize2);
    printf("[%d, %d]\\n", res2[0], res2[1]);
    if (res2) free(res2);
    
    int nums3[] = {3, 3};
    int retSize3;
    int* res3 = twoSum(nums3, 2, 6, &retSize3);
    printf("[%d, %d]\\n", res3[0], res3[1]);
    if (res3) free(res3);
    
    return 0;
}`,
      rust: `
fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
    // Write your solution here
    vec![]
}

fn main() {
    println!("{:?}", two_sum(vec![2, 7, 11, 15], 9));
    println!("{:?}", two_sum(vec![3, 2, 4], 6));
    println!("{:?}", two_sum(vec![3, 3], 6));
}`,
      go: `
package main
import "fmt"

func twoSum(nums []int, target int) []int {
    // Write your solution here
    return []int{}
}

func main() {
    fmt.Println(twoSum([]int{2, 7, 11, 15}, 9))
    fmt.Println(twoSum([]int{3, 2, 4}, 6))
    fmt.Println(twoSum([]int{3, 3}, 6))
}`,
    },
    expectedOutput: {
      javascript: "[0,1]\n[1,2]\n[0,1]",
      python: "[0, 1]\n[1, 2]\n[0, 1]",
      java: "[0, 1]\n[1, 2]\n[0, 1]",
      cpp: "[0, 1]\n[1, 2]\n[0, 1]",
      c: "[0, 1]\n[1, 2]\n[0, 1]",
      rust: "[0, 1]\n[1, 2]\n[0, 1]",
      go: "[0 1]\n[1 2]\n[0 1]",
    },
  },

  "reverse-string": {
    id: "reverse-string",
    title: "Reverse String",
    difficulty: "Easy",
    category: "String • Two Pointers",
    description: {
      text: "Write a function that reverses a string. The input string is given as an array of characters s.",
      notes: ["You must do this by modifying the input array in-place with O(1) extra memory."],
    },
    examples: [
      {
        input: 's = ["h","e","l","l","o"]',
        output: '["o","l","l","e","h"]',
      },
      {
        input: 's = ["H","a","n","n","a","h"]',
        output: '["h","a","n","n","a","H"]',
      },
    ],
    constraints: ["1 ≤ s.length ≤ 10⁵", "s[i] is a printable ascii character"],
    starterCode: {
      javascript: `function reverseString(s) {
  // Write your solution here
  
}

// Test cases
let test1 = ["h","e","l","l","o"];
reverseString(test1);
console.log(test1); // Expected: ["o","l","l","e","h"]

let test2 = ["H","a","n","n","a","h"];
reverseString(test2);
console.log(test2); // Expected: ["h","a","n","n","a","H"]`,
      python: `def reverseString(s):
    # Write your solution here
    pass

# Test cases
test1 = ["h","e","l","l","o"]
reverseString(test1)
print(test1)  # Expected: ["o","l","l","e","h"]

test2 = ["H","a","n","n","a","h"]
reverseString(test2)
print(test2)  # Expected: ["h","a","n","n","a","H"]`,
      java: `import java.util.*;

class Solution {
    public static void reverseString(char[] s) {
        // Write your solution here
        
    }
    
    public static void main(String[] args) {
        char[] test1 = {'h','e','l','l','o'};
        reverseString(test1);
        System.out.println(Arrays.toString(test1)); // Expected: [o, l, l, e, h]
        
        char[] test2 = {'H','a','n','n','a','h'};
        reverseString(test2);
        System.out.println(Arrays.toString(test2)); // Expected: [h, a, n, n, a, H]
    }
}`,
      cpp: `
#include <iostream>
#include <vector>
using namespace std;

class Solution {
public:
    void reverseString(vector<char>& s) {
        // Write your solution here
        
    }
};

void printVector(const vector<char>& s) {
    cout << "[";
    for(int i=0; i<s.size(); i++) {
        cout << "\\"" << s[i] << "\\"";
        if(i < s.size()-1) cout << ",";
    }
    cout << "]" << endl;
}

int main() {
    Solution sol;
    vector<char> test1 = {'h','e','l','l','o'};
    sol.reverseString(test1);
    printVector(test1);

    vector<char> test2 = {'H','a','n','n','a','h'};
    sol.reverseString(test2);
    printVector(test2);
    return 0;
}`,
      c: `
#include <stdio.h>
#include <string.h>

void reverseString(char* s, int sSize) {
    // Write your solution here
    
}

void printArray(char* s, int size) {
    printf("[");
    for(int i=0; i<size; i++) {
        printf("\\"%c\\"", s[i]);
        if(i < size-1) printf(",");
    }
    printf("]\\n");
}

int main() {
    char test1[] = {'h','e','l','l','o'};
    reverseString(test1, 5);
    printArray(test1, 5);

    char test2[] = {'H','a','n','n','a','h'};
    reverseString(test2, 6);
    printArray(test2, 6);
    return 0;
}`,
      rust: `
fn reverse_string(s: &mut Vec<char>) {
    // Write your solution here
}

fn main() {
    let mut test1 = vec!['h','e','l','l','o'];
    reverse_string(&mut test1);
    println!("{:?}", test1);

    let mut test2 = vec!['H','a','n','n','a','h'];
    reverse_string(&mut test2);
    println!("{:?}", test2);
}`,
      go: `
package main
import "fmt"

func reverseString(s []byte) {
    // Write your solution here
}

func main() {
    test1 := []byte{'h','e','l','l','o'}
    reverseString(test1)
    printSlice(test1)

    test2 := []byte{'H','a','n','n','a','h'}
    reverseString(test2)
    printSlice(test2)
}

func printSlice(s []byte) {
    fmt.Print("[")
    for i, c := range s {
        fmt.Printf("%q", c)
        if i < len(s)-1 {
            fmt.Print(" ")
        }
    }
    fmt.Println("]")
}`,
    },
    expectedOutput: {
      javascript: '["o","l","l","e","h"]\n["h","a","n","n","a","H"]',
      python: "['o', 'l', 'l', 'e', 'h']\n['h', 'a', 'n', 'n', 'a', 'H']",
      java: "[o, l, l, e, h]\n[h, a, n, n, a, H]",
      cpp: '["o","l","l","e","h"]\n["h","a","n","n","a","H"]',
      c: '["o","l","l","e","h"]\n["h","a","n","n","a","H"]',
      rust: "['o', 'l', 'l', 'e', 'h']\n['h', 'a', 'n', 'n', 'a', 'H']",
      go: "['o' 'l' 'l' 'e' 'h']\n['h' 'a' 'n' 'n' 'a' 'H']",
    },
  },

  "valid-palindrome": {
    id: "valid-palindrome",
    title: "Valid Palindrome",
    difficulty: "Easy",
    category: "String • Two Pointers",
    description: {
      text: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.",
      notes: ["Given a string s, return true if it is a palindrome, or false otherwise."],
    },
    examples: [
      {
        input: 's = "A man, a plan, a canal: Panama"',
        output: "true",
        explanation: '"amanaplanacanalpanama" is a palindrome.',
      },
      {
        input: 's = "race a car"',
        output: "false",
        explanation: '"raceacar" is not a palindrome.',
      },
      {
        input: 's = " "',
        output: "true",
        explanation:
          's is an empty string "" after removing non-alphanumeric characters. Since an empty string reads the same forward and backward, it is a palindrome.',
      },
    ],
    constraints: ["1 ≤ s.length ≤ 2 * 10⁵", "s consists only of printable ASCII characters"],
    starterCode: {
      javascript: `function isPalindrome(s) {
  // Write your solution here
  
}

// Test cases
console.log(isPalindrome("A man, a plan, a canal: Panama")); // Expected: true
console.log(isPalindrome("race a car")); // Expected: false
console.log(isPalindrome(" ")); // Expected: true`,
      python: `def isPalindrome(s):
    # Write your solution here
    pass

# Test cases
print(isPalindrome("A man, a plan, a canal: Panama"))  # Expected: True
print(isPalindrome("race a car"))  # Expected: False
print(isPalindrome(" "))  # Expected: True`,
      java: `class Solution {
    public static boolean isPalindrome(String s) {
        // Write your solution here
        
        return false;
    }
    
    public static void main(String[] args) {
        System.out.println(isPalindrome("A man, a plan, a canal: Panama")); // Expected: true
        System.out.println(isPalindrome("race a car")); // Expected: false
        System.out.println(isPalindrome(" ")); // Expected: true
    }
}`,
      cpp: `
#include <iostream>
#include <string>
#include <cctype>
using namespace std;

class Solution {
public:
    bool isPalindrome(string s) {
        // Write your solution here
        return false;
    }
};

int main() {
    Solution sol;
    cout << boolalpha;
    cout << sol.isPalindrome("A man, a plan, a canal: Panama") << endl;
    cout << sol.isPalindrome("race a car") << endl;
    cout << sol.isPalindrome(" ") << endl;
    return 0;
}`,
      c: `
#include <stdio.h>
#include <stdbool.h>
#include <ctype.h>
#include <string.h>

bool isPalindrome(char* s) {
    // Write your solution here
    return false;
}

int main() {
    printf("%s\\n", isPalindrome("A man, a plan, a canal: Panama") ? "true" : "false");
    printf("%s\\n", isPalindrome("race a car") ? "true" : "false");
    printf("%s\\n", isPalindrome(" ") ? "true" : "false");
    return 0;
}`,
      rust: `
fn is_palindrome(s: String) -> bool {
    // Write your solution here
    false
}

fn main() {
    println!("{}", is_palindrome(String::from("A man, a plan, a canal: Panama")));
    println!("{}", is_palindrome(String::from("race a car")));
    println!("{}", is_palindrome(String::from(" ")));
}`,
      go: `
package main
import (
    "fmt"
    "strings"
)

func isPalindrome(s string) bool {
    // Write your solution here
    return false
}

func main() {
    fmt.Println(isPalindrome("A man, a plan, a canal: Panama"))
    fmt.Println(isPalindrome("race a car"))
    fmt.Println(isPalindrome(" "))
}`,
    },
    expectedOutput: {
      javascript: "true\nfalse\ntrue",
      python: "True\nFalse\nTrue",
      java: "true\nfalse\ntrue",
      cpp: "true\nfalse\ntrue",
      c: "true\nfalse\ntrue",
      rust: "true\nfalse\ntrue",
      go: "true\nfalse\ntrue",
    },
  },

  "maximum-subarray": {
    id: "maximum-subarray",
    title: "Maximum Subarray",
    difficulty: "Medium",
    category: "Array • Dynamic Programming",
    description: {
      text: "Given an integer array nums, find the subarray with the largest sum, and return its sum.",
      notes: [],
    },
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation: "The subarray [4,-1,2,1] has the largest sum 6.",
      },
      {
        input: "nums = [1]",
        output: "1",
        explanation: "The subarray [1] has the largest sum 1.",
      },
      {
        input: "nums = [5,4,-1,7,8]",
        output: "23",
        explanation: "The subarray [5,4,-1,7,8] has the largest sum 23.",
      },
    ],
    constraints: ["1 ≤ nums.length ≤ 10⁵", "-10⁴ ≤ nums[i] ≤ 10⁴"],
    starterCode: {
      javascript: `function maxSubArray(nums) {
  // Write your solution here
  
}

// Test cases
console.log(maxSubArray([-2,1,-3,4,-1,2,1,-5,4])); // Expected: 6
console.log(maxSubArray([1])); // Expected: 1
console.log(maxSubArray([5,4,-1,7,8])); // Expected: 23`,
      python: `def maxSubArray(nums):
    # Write your solution here
    pass

# Test cases
print(maxSubArray([-2,1,-3,4,-1,2,1,-5,4]))  # Expected: 6
print(maxSubArray([1]))  # Expected: 1
print(maxSubArray([5,4,-1,7,8]))  # Expected: 23`,
      java: `class Solution {
    public static int maxSubArray(int[] nums) {
        // Write your solution here
        
        return 0;
    }
    
    public static void main(String[] args) {
        System.out.println(maxSubArray(new int[]{-2,1,-3,4,-1,2,1,-5,4})); // Expected: 6
        System.out.println(maxSubArray(new int[]{1})); // Expected: 1
        System.out.println(maxSubArray(new int[]{5,4,-1,7,8})); // Expected: 23
    }
}`,
      cpp: `
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        // Write your solution here
        return 0;
    }
};

int main() {
    Solution sol;
    vector<int> nums1 = {-2,1,-3,4,-1,2,1,-5,4};
    cout << sol.maxSubArray(nums1) << endl;

    vector<int> nums2 = {1};
    cout << sol.maxSubArray(nums2) << endl;

    vector<int> nums3 = {5,4,-1,7,8};
    cout << sol.maxSubArray(nums3) << endl;
    return 0;
}`,
      c: `
#include <stdio.h>
#include <limits.h>

int maxSubArray(int* nums, int numsSize) {
    // Write your solution here
    return 0;
}

int main() {
    int nums1[] = {-2,1,-3,4,-1,2,1,-5,4};
    printf("%d\\n", maxSubArray(nums1, 9));

    int nums2[] = {1};
    printf("%d\\n", maxSubArray(nums2, 1));

    int nums3[] = {5,4,-1,7,8};
    printf("%d\\n", maxSubArray(nums3, 5));
    return 0;
}`,
      rust: `
fn max_sub_array(nums: Vec<i32>) -> i32 {
    // Write your solution here
    0
}

fn main() {
    println!("{}", max_sub_array(vec![-2,1,-3,4,-1,2,1,-5,4]));
    println!("{}", max_sub_array(vec![1]));
    println!("{}", max_sub_array(vec![5,4,-1,7,8]));
}`,
      go: `
package main
import "fmt"

func maxSubArray(nums []int) int {
    // Write your solution here
    return 0
}

func main() {
    fmt.Println(maxSubArray([]int{-2,1,-3,4,-1,2,1,-5,4}))
    fmt.Println(maxSubArray([]int{1}))
    fmt.Println(maxSubArray([]int{5,4,-1,7,8}))
}`,
    },
    expectedOutput: {
      javascript: "6\n1\n23",
      python: "6\n1\n23",
      java: "6\n1\n23",
      cpp: "6\n1\n23",
      c: "6\n1\n23",
      rust: "6\n1\n23",
      go: "6\n1\n23",
    },
  },

  "container-with-most-water": {
    id: "container-with-most-water",
    title: "Container With Most Water",
    difficulty: "Medium",
    category: "Array • Two Pointers",
    description: {
      text: "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).",
      notes: [
        "Find two lines that together with the x-axis form a container, such that the container contains the most water.",
        "Return the maximum amount of water a container can store.",
        "Notice that you may not slant the container.",
      ],
    },
    examples: [
      {
        input: "height = [1,8,6,2,5,4,8,3,7]",
        output: "49",
        explanation:
          "The vertical lines are represented by array [1,8,6,2,5,4,8,3,7]. In this case, the max area of water the container can contain is 49.",
      },
      {
        input: "height = [1,1]",
        output: "1",
      },
    ],
    constraints: ["n == height.length", "2 ≤ n ≤ 10⁵", "0 ≤ height[i] ≤ 10⁴"],
    starterCode: {
      javascript: `function maxArea(height) {
  // Write your solution here
  
}

// Test cases
console.log(maxArea([1,8,6,2,5,4,8,3,7])); // Expected: 49
console.log(maxArea([1,1])); // Expected: 1`,
      python: `def maxArea(height):
    # Write your solution here
    pass

# Test cases
print(maxArea([1,8,6,2,5,4,8,3,7]))  # Expected: 49
print(maxArea([1,1]))  # Expected: 1`,
      java: `class Solution {
    public static int maxArea(int[] height) {
        // Write your solution here
        
        return 0;
    }
    
    public static void main(String[] args) {
        System.out.println(maxArea(new int[]{1,8,6,2,5,4,8,3,7})); // Expected: 49
        System.out.println(maxArea(new int[]{1,1})); // Expected: 1
    }
}`,
      cpp: `
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxArea(vector<int>& height) {
        // Write your solution here
        return 0;
    }
};

int main() {
    Solution sol;
    vector<int> h1 = {1,8,6,2,5,4,8,3,7};
    cout << sol.maxArea(h1) << endl;

    vector<int> h2 = {1,1};
    cout << sol.maxArea(h2) << endl;
    return 0;
}`,
      c: `
#include <stdio.h>

int maxArea(int* height, int heightSize) {
    // Write your solution here
    return 0;
}

int main() {
    int h1[] = {1,8,6,2,5,4,8,3,7};
    printf("%d\\n", maxArea(h1, 9));

    int h2[] = {1,1};
    printf("%d\\n", maxArea(h2, 2));
    return 0;
}`,
      rust: `
fn max_area(height: Vec<i32>) -> i32 {
    // Write your solution here
    0
}

fn main() {
    println!("{}", max_area(vec![1,8,6,2,5,4,8,3,7]));
    println!("{}", max_area(vec![1,1]));
}`,
      go: `
package main
import "fmt"

func maxArea(height []int) int {
    // Write your solution here
    return 0
}

func main() {
    fmt.Println(maxArea([]int{1,8,6,2,5,4,8,3,7}))
    fmt.Println(maxArea([]int{1,1}))
}`,
    },
    expectedOutput: {
      javascript: "49\n1",
      python: "49\n1",
      java: "49\n1",
      cpp: "49\n1",
      c: "49\n1",
      rust: "49\n1",
      go: "49\n1",
    },
  },
};

export const LANGUAGE_CONFIG = {
  javascript: {
    name: "JavaScript",
    icon: "/javascript.png",
    monacoLang: "javascript",
  },
  python: {
    name: "Python",
    icon: "/python.png",
    monacoLang: "python",
  },
  java: {
    name: "Java",
    icon: "/java.png",
    monacoLang: "java",
  },

  cpp: {
    name: "C++",
    icon: "/cpp.png", // Make sure to add this image to public folder
    monacoLang: "cpp",
  },
  c: {
    name: "C",
    icon: "/c.png", // Make sure to add this image to public folder
    monacoLang: "c",
  },
  rust: {
    name: "Rust",
    icon: "/rust.png", // Make sure to add this image to public folder
    monacoLang: "rust",
  },
  go: {
    name: "Go",
    icon: "/go.png", // Make sure to add this image to public folder
    monacoLang: "go",
  },
};
