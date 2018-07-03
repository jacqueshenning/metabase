import React from "react";
import { Flex } from "grid-styled";
import Icon from "metabase/components/Icon";
import Link from "metabase/components/Link";

// TODO: merge with Breadcrumbs

const Crumb = ({ children }) => (
  <h5
    className="text-uppercase text-brand-hover"
    style={{ color: "#93A1AB", fontWeight: 900 }}
  >
    {children}
  </h5>
);

const BrowserCrumbs = ({ crumbs }) => (
  <Flex align="center">
    {crumbs.filter(c => c).map((crumb, index, crumbs) => [
      crumb.to && (
        <Flex align="center">
          <Link key={"title" + index} to={crumb.to}>
            <Crumb>{crumb.title}</Crumb>
          </Link>
          {index < crumbs.length - 1 ? (
            <Icon
              key={"divider" + index}
              name="chevronright"
              color="#DCE1E4"
              mx={1}
            />
          ) : null}
        </Flex>
      ),
    ])}
  </Flex>
);

export default BrowserCrumbs;