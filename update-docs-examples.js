const fs = require('fs');
let html = fs.readFileSync('docs/documentation.html', 'utf8');

const targetStr = `                        <h4 class="mt-4">Global Data Binding</h4>
                        <p>Any data fetched using <code>&lt;an-data&gt;</code> becomes globally available to the entire document. You can inject specific strings or nested objects directly into your HTML or component attributes anywhere on the page, without needing a loop!</p>
                        <pre><code class="language-html">&lt;an-data src="config.json" name="appConfig" /&gt;

&lt;!-- Accessing object properties --&gt;
&lt;h1&gt;Welcome to {{ appConfig.storeName }}&lt;/h1&gt;

&lt;!-- Accessing array indexes natively --&gt;
&lt;p&gt;Featured item: {{ appConfig.featuredItems[0].name }}&lt;/p&gt;
</code></pre>`;

const replaceStr = `                        <h4 class="mt-5">Example 2 (Global Data Binding & Arrays):</h4>
                        <p>Any data fetched using <code>&lt;an-data&gt;</code> becomes globally available to the entire document. You can inject specific strings or nested objects directly into your HTML or component attributes anywhere on the page, without needing a loop!</p>
                        <pre><code class="language-html"><an-code src="codes/an-data-example-02.txt"></an-code></code></pre>
                        
                        <h4>Rendered HTML (Example 2):</h4>
                        <pre class="rendered-html-block"><code class="language-html"><an-code src="codes/an-data-rendered-html-2.txt"></an-code></code></pre>`;

if(html.includes(targetStr)) {
    html = html.replace(targetStr, replaceStr);
    fs.writeFileSync('docs/documentation.html', html);
    console.log('Success updating documentation.html');
} else {
    console.log('Target string not found');
}
