<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="xml" indent="no" omit-xml-declaration="yes" encoding="UTF-8" cdata-section-elements="script"/>
  <xsl:preserve-space elements="textedit" />

  <!-- inherit template -->
  <xsl:template match="@*|node()">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()"/>
    </xsl:copy>
  </xsl:template>

  <!-- match template to manialink -->
  <xsl:template match="/">
    <xsl:apply-templates select="@*|node()"/>
  </xsl:template>

  <xsl:template match="Checkbox">
    <!--#region uicheckbox parameters-->
    <xsl:param name="pos"/>
    <xsl:param name="id"/>
    <xsl:param name="checked"/>
    <xsl:param name="name"/>
    <xsl:param name="text"/>
    <xsl:param name="disabled"/>

    <!--#endregion-->
    <!--#region uiCheckbox definition-->
    <frame pos="{@pos}" id="{@id}" class="uiContainer uiCheckbox" data-checked="{@checked}" data-disabled="{@disabled}">
      <entry pos="900 900" z-index="0" size="6 6" text="1" textsize="3" valign="center2" halign="center"
             textformat="Basic" name="{@name}" scriptevents="1"/>
      <label pos="6 -2.5" z-index="0" size="100 5" text="{@text}" textsize="2" scriptevents="1"
             focusareacolor1="0000" focusareacolor2="0000" valign="center"/>
      <label pos="2.5 -2" z-index="0" size="6 6" textemboss="0" textsize="3" scale="0" text="✓" valign="center2"
             halign="center" class="uiCheck uiCheckboxElement" scriptevents="1" focusareacolor1="0000"
             focusareacolor2="0000"/>
      <label pos="2 -2.5" z-index="0" size="6 6" textemboss="0" textsize="4" text="⬜" valign="center2" halign="center"
             class="uiCheckboxElement" scriptevents="1" focusareacolor1="0000" focusareacolor2="0000"/>
    </frame>
    <!--#endregion -->
  </xsl:template>

  <xsl:template match="CheckboxGroup">
    <!--#region uicheckbox parameters-->
    <xsl:param name="pos"/>
    <xsl:param name="id"/>
    <xsl:param name="checked"/>
    <xsl:param name="disabled"/>
    <xsl:param name="name"/>
    <xsl:param name="group"/>
    <xsl:param name="text"/>
    <xsl:param name="type"/>
    <!--#endregion-->
    <!--#region uiCheckbox definition-->
    <frame
      pos="{@pos}" id="{@id}" class="uiContainer uiCheckbox uiCheckboxGroup {{@group}}" data-checked="{@checked}"
      data-disabled="{@disabled}">
      <entry pos="900 900" z-index="0" size="6 6" textemboss="1" text="1" textsize="3" valign="center2" halign="center"
             textformat="Basic" name="{@name}" scriptevents="1"/>
      <label pos="6 -2.5" z-index="0" size="100 5" text="{@text}" textsize="2" scriptevents="1"
             focusareacolor1="0000" focusareacolor2="0000" valign="center"/>
      <label pos="2.5 -2" z-index="0" size="6 6" textemboss="0" textsize="3" scale="0" text="✓" valign="center2"
             halign="center" class="uiCheck uiCheckboxElement" data-group="{@group}" scriptevents="1"/>
      <label pos="2 -2.5" z-index="0" size="6 6" textemboss="0" textsize="4" text="⬜" valign="center2" halign="center"
             class="uiCheckboxElement" data-group="{@group}" scriptevents="1" focusareacolor1="0000"
             focusareacolor2="0000"/>
    </frame>
    <!--#endregion -->
  </xsl:template>

  <xsl:template match="ButtonOutline">
    <!--#region Button parameters-->
    <xsl:param name="id"/>
    <xsl:param name="action"/>
    <xsl:param name="type"/>
    <xsl:param name="halign"/>
    <xsl:param name="valign"/>
    <xsl:param name="text"/>
    <xsl:param name="posX" select="number(substring-before(concat(@pos,' '),' '))"/>
    <xsl:param name="posY" select="number(substring-after(concat(@pos,' '),' '))"/>
    <xsl:param name="width" select="number(substring-before(concat(@size,' '),' '))"/>
    <xsl:param name="height" select="number(substring-after(concat(@size,' '),' '))"/>
    <xsl:param name="posYdiv" select="$height div 2"/>
    <xsl:param name="posXdiv" select="$width div 2"/>
    <!--#endregion -->
    <!--#region Button parameters-->
    <xsl:choose>
      <xsl:when test="@halign = 'center'">
        <frame pos="{$posX + $posXdiv} {($posY - $posYdiv)}" class="uiContainer uiButton">
          <quad size="{$width*2} {$height*2}" scale="0.5" style="Bgs1InRace" class="{@type}" substyle="BgColorContour"
                halign="center" valign="center2"/>
          <label size="{ ( $width - 0.5 )} {( $height - 0.5)}" text="{@text}" class="{@type} uiButtonElement"
                 halign="center"
                 valign="center2" focusareacolor1="0000" focusareacolor2="{@color}" scriptevents="1" translate="0"
                 textsize="1.2" textfont="RobotoCondensedBold"
                 action="{@action}"/>
        </frame>
      </xsl:when>
      <xsl:otherwise>
        <frame pos="{$posX} {($posY - $posYdiv)}" class="uiContainer uiButton">
          <quad size="{$width*2} {$height*2}" style="Bgs1InRace" class="{@type}" substyle="BgColorContour"
                halign="center" scale="0.5" valign="center2"/>
          <label size="{( $width - 0.5 )} {( $height - 0.5 )}" text="{@text}" class="{ @type } uiButtonElement"
                 halign="center"
                 valign="center2" focusareacolor1="0000" focusareacolor2="{@color}" scriptevents="1" translate="0"
                 textsize="1.2" textfont="RobotoCondensedBold"
                 action="{@action}"/>
        </frame>
      </xsl:otherwise>
    </xsl:choose>
    <!--#endregion -->
  </xsl:template>

  <xsl:template match="Button">
    <!--#region Button parameters-->
    <xsl:param name="id"/>
    <xsl:param name="action"/>
    <xsl:param name="type"/>
    <xsl:param name="halign"/>
    <xsl:param name="valign"/>
    <xsl:param name="text"/>
    <xsl:param name="posX" select="number(substring-before(concat(@pos,' '),' '))"/>
    <xsl:param name="posY" select="number(substring-after(concat(@pos,' '),' '))"/>
    <xsl:param name="width" select="number(substring-before(concat(@size,' '),' '))"/>
    <xsl:param name="height" select="number(substring-after(concat(@size,' '),' '))"/>
    <xsl:param name="posYdiv" select="$height div 2"/>
    <xsl:param name="posXdiv" select="$width div 2"/>
    <!--#endregion -->
    <!--#region Button definition-->
    <xsl:choose>
      <xsl:when test="@halign = 'center'">
        <frame pos="{ $posX + $posXdiv} { ( $posY - $posYdiv)}" class="uiContainer uiButton" z-index="2">
          <label size="{ $width } { $height }" text="{ @text }" class="{@type} uiButtonElement" halign="center"
                 valign="center" textfont="RobotoCondensedBold" scriptevents="1" translate="0" textsize="1.2" action="{ @action }"/>
        </frame>
      </xsl:when>
      <xsl:otherwise>
        <frame pos="{ $posX } { ( $posY - $posYdiv ) }" class="uiContainer uiButton" z-index="2">
          <label size="{ $width } { $height }" text="{ @text }" class="{@type} uiButtonElement" halign="left"
                 valign="center" textfont="RobotoCondensedBold" scriptevents="1" translate="0" textsize="1.2" action="{ @action }"/>
        </frame>
      </xsl:otherwise>
    </xsl:choose>
    <!--#endregion -->
  </xsl:template>

  <xsl:template match="ButtonConfirm">
    <!--#region Button parameters-->
    <xsl:param name="id"/>
    <xsl:param name="action"/>
    <xsl:param name="halign"/>
    <xsl:param name="valign"/>
    <xsl:param name="text"/>
    <xsl:param name="type"/>
    <xsl:param name="color"/>
    <xsl:param name="posX" select="number(substring-before(concat(@pos,' '),' '))"/>
    <xsl:param name="posY" select="number(substring-after(concat(@pos,' '),' '))"/>
    <xsl:param name="width" select="number(substring-before(concat(@size,' '),' '))"/>
    <xsl:param name="height" select="number(substring-after(concat(@size,' '),' '))"/>
    <xsl:param name="posYdiv" select="$height div 2"/>
    <xsl:param name="posXdiv" select="$width div 2"/>
    <!--#endregion -->
    <!--#region Button definition-->
    <xsl:choose>
      <xsl:when test="@halign = 'center'">
        <frame pos="{$posX +$posXdiv} {($posY - $posYdiv)}" class="uiContainer uiButton" data-action="{@action}">
          <quad size="{$width*2} {$height*2}" scale="0.5" style="Bgs1InRace" class="{@type}" substyle="BgColorContour"
                halign="center" valign="center2"/>
          <label size="{( $width - 0.5)} {($height - 0.5)}" text="{@text}" class="{@type} uiConfirmButtonElement"
                 halign="center" textfont="RobotoCondensedBold"
                 valign="center" scriptevents="1" focusareacolor1="0000" focusareacolor2="{@color}" translate="0"
                 textsize="1.2"/>
        </frame>
      </xsl:when>
      <xsl:otherwise>
        <frame pos="{$posX} {($posY - $posYdiv)}" class="uiContainer uiButton" data-action="{@action}">
          <quad size="{$width*2} {$height*2}" scale="0.5" style="Bgs1InRace" class="{@type}" substyle="BgColorContour"
                halign="center" valign="center2"/>
          <label size="{ ($width - 0.5)} {($height - 0.5)}" text="{@text}" class="{@type} uiConfirmButtonElement"
                 halign="center" textfont="RobotoCondensedBold"
                 valign="center" scriptevents="1" focusareacolor1="0000" focusareacolor2="{@color}" translate="0"
                 textsize="1.2"/>
        </frame>
      </xsl:otherwise>
    </xsl:choose>
    <!--#endregion -->
  </xsl:template>

  <xsl:template match="InputMasked">
    <!--#region input parameters-->
    <xsl:param name="text"/>
    <xsl:param name="name"/>
    <xsl:param name="pos"/>
    <xsl:param name="width" select="number(substring-before(concat(@size,' '),' '))"/>
    <xsl:param name="height" select="number(substring-after(concat(@size,' '),' '))"/>
    <!--#endregion -->
    <!--#region input definition-->
    <frame pos="{@pos}" class="uiContainer uiInputMasked" data-type="Password" z-index="3">
      <entry pos="0 0" size="{($width - 5)} 5" textsize="1.2" valign="center"
             selecttext="1" default="{@text}" textformat="Password" name="{@name}"/>
      <frame pos="{($width - 2.5)} 0" class="">
        <quad size="10 10" scale="0.5" style="Bgs1InRace" colorize="ddd" substyle="BgColorContour" halign="center"
              valign="center2"/>
        <label size="4 4" text="" class="uiMaskedToggle" halign="center" valign="center2" focusareacolor1="0000"
               focusareacolor2="ddd" scriptevents="1" translate="0" textsize="1.2"/>
      </frame>
    </frame>
    <!--#endregion-->
  </xsl:template>

  <xsl:template match="Input">
    <!--#region input parameters-->
    <xsl:param name="text"/>
    <xsl:param name="name"/>
    <xsl:param name="pos"/>
    <xsl:param name="id"/>
    <xsl:param name="class"/>
    <xsl:param name="width" select="number(substring-before(concat(@size,' '),' '))"/>
    <xsl:param name="height" select="number(substring-after(concat(@size,' '),' '))"/>
    <!--#endregion -->
    <!--#region input definition-->
    <frame pos="{ @pos }" class="uiContainer uiInput" data-type="Basic" id="@id" z-index="3">
      <entry pos="0 0" size="{ $width } 5" textsize="1.2" valign="center" class="uiEntry"
             default="{ @text }" maxlen="8192" selecttext="1" scriptevents="1" textformat="Basic" name="{ @name }" z-index="2"/>
    </frame>
    <!--#endregion-->
  </xsl:template>

  <xsl:template match="InputPassword">
    <!--#region input parameters-->
    <xsl:param name="text"/>
    <xsl:param name="name"/>
    <xsl:param name="pos"/>
    <xsl:param name="width" select="number(substring-before(concat(@size,' '),' '))"/>
    <xsl:param name="height" select="number(substring-after(concat(@size,' '),' '))"/>
    <!--#endregion -->
    <!--#region input definition-->
    <frame pos="{@pos}" class="uiContainer uiInput" data-type="Basic" z-index="3">
      <entry pos="0 0" size="{$width} 5" textsize="1.2" valign="center"
             default="{@text}" selecttext="1" scriptevents="1" textformat="Password" name="{@name}"/>
    </frame>
    <!--#endregion-->
  </xsl:template>


  <xsl:template match="Dropdown">
    <!--#region dropdown parameters-->
    <xsl:param name="posX" select="number(substring-before(concat(@pos,' '),' '))"/>
    <xsl:param name="posY" select="number(substring-after(concat(@pos,' '),' '))"/>
    <xsl:param name="width" select="number(substring-before(concat(@size,' '),' '))"/>
    <xsl:param name="height" select="number(substring-after(concat(@size,' '),' '))"/>
    <xsl:param name="heightDiv" select="$height div 2"/>
    <xsl:param name="widthDiv" select="$width div 2"/>
    <xsl:param name="selectedindex"/>
    <xsl:variable name="optionsCount" select="count(Option)"/>
    <!--#endregion -->
    <!--#region dropdown parameters-->
    <frame pos="{$posX} {$posY}" class="uiContainer uiDropdown" data-selected="{@selectedindex}" data-open="0" z-index="1">
      <label pos="{$width - 5} 0" size="5 {$height}" z-index="2" class="uiSelectElement" text="⏷" />
      <label pos="0 -{$heightDiv}" size="{$width} {$height}" textsize="1.2" textprefix=" " text="Select..."
             valign="center" scriptevents="1" class="uiSelectElement" z-index="2" />
      <entry pos="900 900" size="26 5" textemboss="1" text="1" textsize="1.2" valign="center2" halign="center"
             textformat="Basic" name="{@name}"/>

      <frame pos="0 -{$height}" z-index="10" class="uiDropdownSelect" size="{$width} {$optionsCount*$height}">
        <xsl:for-each select="Option">
          <label pos="0 -{position() * $height - $heightDiv}" size="{$width} {$height}" text="{@text}"
                 data-value="{@value}" valign="center" data-index="{position() - 1}" scriptevents="1" textsize="1.2"
                 class="uiSelectElement"/>
        </xsl:for-each>
      </frame>
    </frame>
    <!--#endregion -->
  </xsl:template>

  <xsl:template match="Scrollable">
    <xsl:param name="pos"/>
    <xsl:param name="width" select="number(substring-before(concat(@size,' '),' '))"/>
    <xsl:param name="height" select="number(substring-after(concat(@size,' '),' '))"/>
    <xsl:param name="scrollWidth" select="number(substring-before(concat(@scrollsize,' '),' '))"/>
    <xsl:param name="scrollHeight" select="number(substring-after(concat(@scrollsize,' '),' '))"/>

    <frame pos="{@pos}">
      <frame class="uiScrollable" scroll="1" size="{$width - 5} {$height - 5}"
             scrollmax="{$scrollWidth} {$scrollHeight}">
        <frame>
          <xsl:apply-templates select="node()"/>
          <quad pos="0 0" size="900 900" z-index="-3" bgcolor="0004" scriptevents="1"/>
        </frame>
      </frame>
      <frame pos="{$width} 0" class="uiScrollbarControl" z-index="3">
        <quad pos="0 -4" size="4 10" halign="right" valign="top" class="uiScrollbar" data-axis="Y" bgcolor="fffa"
              bgcolorfocus="ffff" scriptevents="1" z-index="1"/>
        <label size="4 4" sizen="4 4" halign="right" valign="top" text="⏶" scriptevents="1"
               focusareacolor1="aaa" focusareacolor2="777" z-index="1"/>
        <label pos="0 -{$height}" size="4 4" halign="right" valign="bottom" text="⏷" scriptevents="1"
               focusareacolor1="aaa" focusareacolor2="777" z-index="1"/>
        <quad size="4 {$height}" halign="right" valign="top" bgcolor="000a" z-index="0"/>
      </frame>
    </frame>
  </xsl:template>
</xsl:stylesheet>
