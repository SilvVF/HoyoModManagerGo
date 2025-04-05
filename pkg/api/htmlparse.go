package api

import (
	"strings"

	"golang.org/x/net/html"
)

func hasAllClasses(attr html.Attribute, required []string) bool {
	classes := strings.Fields(attr.Val)
	classSet := map[string]struct{}{}

	for _, c := range classes {
		classSet[c] = struct{}{}
	}

	for _, req := range required {
		if _, ok := classSet[req]; !ok {
			return false
		}
	}
	return true
}

func findMatchingElems(n *html.Node, elem string) []*html.Node {
	result := []*html.Node{}
	var crawler func(*html.Node)

	crawler = func(node *html.Node) {
		if node.Type == html.ElementNode && node.Data == elem {
			result = append(result, node)
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			crawler(child)
		}
	}
	crawler(n)

	return result
}

func attrsForNode(n *html.Node) map[string][]string {
	res := make(map[string][]string, len(n.Attr))
	for _, attr := range n.Attr {
		res[attr.Key] = strings.Fields(attr.Val)
	}
	return res
}

func getTextContent(n *html.Node) string {
	if n.Type == html.TextNode {
		return n.Data
	}
	var text string
	for child := n.FirstChild; child != nil; child = child.NextSibling {
		text += getTextContent(child)
	}
	return text
}

func nodeToString(n *html.Node) (string, error) {
	var sb strings.Builder
	err := html.Render(&sb, n)
	if err != nil {
		return "", err
	}
	return sb.String(), nil
}

func findMatchingElemsWithClass(n *html.Node, elem string, requiredClasses ...string) []*html.Node {
	result := []*html.Node{}

	var crawler func(*html.Node)
	crawler = func(node *html.Node) {
		if node.Type == html.ElementNode && node.Data == elem {
			for _, attr := range node.Attr {
				if attr.Key == "class" && hasAllClasses(attr, requiredClasses) {
					result = append(result, node)
					break
				}
			}
		}
		for c := node.FirstChild; c != nil; c = c.NextSibling {
			crawler(c)
		}
	}
	crawler(n)

	return result
}
