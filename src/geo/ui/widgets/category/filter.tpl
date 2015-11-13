<p class="Widget-textSmaller Widget-textSmaller--bold Widget-textSmaller--dark Widget-textSmaller--upper">
  <%- rejectedCats === 0 && acceptedCats === 0 || acceptedCats >= totalCats ? "All selected" : acceptedCats + " selected" %>
</p>
<div class="Widget-filterButtons">
  <% if (rejectedCats !== 0 && totalCats > 0 || acceptedCats > 0) { %>
    <button class="Widget-link Widget-filterButton js-all">select all</button>
  <% } %>
  <% if (totalCats > rejectedCats) { %>
    <button class="Widget-link Widget-filterButton js-none">unselect all</button>
  <% } %>
</div>